import { Retry } from "nexoraldns-shared";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import { logger, ACLKeys } from 'nexoraldns-shared';

// Redis key scheme is defined in ACLKeys (shared/). Exact/wild sets are split
// so AclBlockingService can do an O(1) exact-match check before scanning wildcards.

interface DomainEntry {
  domain: string;
  isWildcard: boolean;
}

interface ExpandedPolicy {
  policyName: string;
  targetIPs: string[];
  blockedDomains: DomainEntry[];
  isActive: boolean;
}

const ACL_RELOAD_LOCK = 'acl:reload-lock';
const ACL_RELOAD_LOCK_TTL_SECONDS = 30;
const ACL_RELOAD_LOCK_ATTEMPTS = 20;
const ACL_RELOAD_LOCK_RETRY_MS = 50;

function waitForACLReloadLock(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ACL_RELOAD_LOCK_RETRY_MS));
}

/** Convert a policy domain to the form used for DNS matching. */
export function normalizeDomainEntry(value: unknown): DomainEntry | null {
  const source = typeof value === 'string'
    ? { domain: value, isWildcard: value.startsWith('*.') || value.endsWith('.*') }
    : value;
  if (typeof source !== 'object' || source === null) return null;

  const entry = source as Record<string, unknown>;
  if (typeof entry.domain !== 'string') return null;

  const domain = entry.domain.trim().toLowerCase().replace(/\.+$/, '');
  if (!domain) return null;

  return {
    domain,
    isWildcard: entry.isWildcard === true || domain === '*' || domain.startsWith('*.') || domain.endsWith('.*'),
  };
}

function appendNormalizedDomains(values: unknown[], target: DomainEntry[]): void {
  for (const value of values) {
    const entry = normalizeDomainEntry(value);
    if (entry) target.push(entry);
  }
}

/**
 * Load all Access Control Policies to Redis for fast DNS filtering
 * This runs every 60 seconds to keep policies in sync
 */
export async function loadAccessControlPoliciesToRedis(): Promise<void> {
  logger.info('[ACL] Loading access control policies to Redis...');

  const startTime = Date.now();
  const redisClient = await container.get<RedisCacheService>('RedisCacheService').getClient();
  const lockToken = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let acquired: string | null = null;
  for (let attempt = 0; attempt < ACL_RELOAD_LOCK_ATTEMPTS && acquired !== 'OK'; attempt += 1) {
    acquired = await redisClient.set(ACL_RELOAD_LOCK, lockToken, {
      NX: true,
      EX: ACL_RELOAD_LOCK_TTL_SECONDS,
    });
    if (acquired !== 'OK') await waitForACLReloadLock();
  }
  if (acquired !== 'OK') {
    throw new Error('ACL reload lock was not acquired');
  }

  try {
  const policiesCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
  const ipGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
  const domainGroupsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);

  if (!policiesCollection || !ipGroupsCollection || !domainGroupsCollection) {
    throw new Error("Database collections not initialized");
  }

  const activePolicies = await policiesCollection.find({ isActive: true }).toArray();
  logger.info(`[ACL] Found ${activePolicies.length} active policies`);

  const [ipGroups, domainGroups] = await Promise.all([
    ipGroupsCollection.find({}).toArray(),
    domainGroupsCollection.find({}).toArray()
  ]);

  const ipGroupMap = new Map(ipGroups.map(g => [g._id.toString(), g.ipAddresses || []]));
  const domainGroupMap = new Map(domainGroups.map(g => [g._id.toString(), g.domains || []]));

  logger.info(`[ACL] Loaded ${ipGroups.length} IP groups and ${domainGroups.length} domain groups`);

  // Expand all policies (resolve group references to actual IPs and domains)
  const expandedPolicies: ExpandedPolicy[] = [];

  for (const policy of activePolicies) {
    const targetIPs: string[] = [];
    const blockedDomains: DomainEntry[] = [];

    // Expand target IPs
    switch (policy.targetType) {
      case 'all':
        targetIPs.push('*'); // Special marker for all users
        break;
      case 'single_ip':
        if (policy.targetIP) targetIPs.push(policy.targetIP.trim());
        break;
      case 'multiple_ips':
        if (policy.targetIPs) targetIPs.push(...policy.targetIPs.map((ip: string) => ip.trim()));
        break;
      case 'ip_group':
        if (policy.targetIPGroup) {
          const groupId = policy.targetIPGroup.toString();
          const ips = ipGroupMap.get(groupId) || [];
          targetIPs.push(...ips);
        }
        break;
      case 'multiple_ip_groups':
        if (policy.targetIPGroups) {
          for (const groupId of policy.targetIPGroups) {
            const ips = ipGroupMap.get(groupId.toString()) || [];
            targetIPs.push(...ips);
          }
        }
        break;
    }

    // Expand blocked domains with wildcard state
    switch (policy.blockType) {
      case 'full_internet':
        blockedDomains.push({ domain: '*', isWildcard: true }); // Block everything
        break;
      case 'specific_domains':
        if (policy.domains) {
          appendNormalizedDomains(policy.domains, blockedDomains);
        }
        break;
      case 'domain_group':
        if (policy.domainGroup) {
          const groupId = policy.domainGroup.toString();
          const domains = domainGroupMap.get(groupId) || [];
          appendNormalizedDomains(domains, blockedDomains);
        }
        break;
      case 'multiple_domain_groups':
        if (policy.domainGroups) {
          for (const groupId of policy.domainGroups) {
            const domains = domainGroupMap.get(groupId.toString()) || [];
            appendNormalizedDomains(domains, blockedDomains);
          }
        }
        break;
    }

    // Only add if we have both targets and blocks
    if (targetIPs.length > 0 && blockedDomains.length > 0) {
      expandedPolicies.push({
        policyName: policy.policyName,
        targetIPs,
        blockedDomains,
        isActive: policy.isActive
      });
    }
  }

  logger.info(`[ACL] Expanded ${expandedPolicies.length} policies`);

  // Build Redis data structure — split exact vs wildcard so the DNS engine can
  // do O(1) SISMEMBER lookups for exact matches and scan only the small wildcard
  // sets. Exact domains are stored as plain strings; wildcard entries as JSON.
  const ipToExact = new Map<string, Set<string>>();   // acl:ip:{ip}:exact
  const ipToWild = new Map<string, Set<string>>();    // acl:ip:{ip}:wild
  const allUsersExact = new Set<string>();            // acl:all_users:exact
  const allUsersWild = new Set<string>();             // acl:all_users:wild

  const addEntry = (exactSet: Set<string>, wildSet: Set<string>, entry: DomainEntry) => {
    if (entry.isWildcard) {
      wildSet.add(JSON.stringify(entry)); // preserve pattern shape for boundary matching
    } else {
      exactSet.add(entry.domain);         // plain string for SISMEMBER
    }
  };

  for (const policy of expandedPolicies) {
    if (!policy.isActive) continue;

    for (const ip of policy.targetIPs) {
      if (ip === '*') {
        // Policy applies to all users
        for (const domainEntry of policy.blockedDomains) {
          addEntry(allUsersExact, allUsersWild, domainEntry);
        }
      } else {
        // Policy applies to specific IP
        if (!ipToExact.has(ip)) ipToExact.set(ip, new Set());
        if (!ipToWild.has(ip)) ipToWild.set(ip, new Set());
        for (const domainEntry of policy.blockedDomains) {
          addEntry(ipToExact.get(ip)!, ipToWild.get(ip)!, domainEntry);
        }
      }
    }
  }

  const trackedIPs = new Set<string>([...ipToExact.keys(), ...ipToWild.keys()]);
  const globalBlockCount = allUsersExact.size + allUsersWild.size;
  logger.info(`[ACL] Built lookup structure: ${trackedIPs.size} IPs, ${globalBlockCount} global blocks`);

  const ONE_DAY = 86400;

  // Scan old ACL keys to delete
  const oldAclKeys: string[] = [];
  let cursor = '0';
  do {
    const reply = await redisClient.scan(cursor, { MATCH: 'acl:*', COUNT: 100 });
    cursor = reply.cursor;
    oldAclKeys.push(...reply.keys);
  } while (cursor !== '0');

  // Atomically replace ACL data: delete old + write new in a single MULTI transaction
  const pipeline = redisClient.multi();

  if (oldAclKeys.length > 0) {
    pipeline.del(oldAclKeys);
  }

  if (allUsersExact.size > 0) {
    pipeline.sAdd(ACLKeys.EXACT_GLOBAL, Array.from(allUsersExact));
    pipeline.expire(ACLKeys.EXACT_GLOBAL, ONE_DAY);
  }
  if (allUsersWild.size > 0) {
    pipeline.sAdd(ACLKeys.WILD_GLOBAL, Array.from(allUsersWild));
    pipeline.expire(ACLKeys.WILD_GLOBAL, ONE_DAY);
  }

  for (const ip of trackedIPs) {
    const exact = ipToExact.get(ip);
    const wild = ipToWild.get(ip);
    if (exact && exact.size > 0) {
      const key = ACLKeys.exactIp(ip);
      pipeline.sAdd(key, Array.from(exact));
      pipeline.expire(key, ONE_DAY);
    }
    if (wild && wild.size > 0) {
      const key = ACLKeys.wildIp(ip);
      pipeline.sAdd(key, Array.from(wild));
      pipeline.expire(key, ONE_DAY);
    }
  }

  const metadata = {
    totalPolicies: activePolicies.length,
    expandedPolicies: expandedPolicies.length,
    trackedIPs: trackedIPs.size,
    globalBlocks: globalBlockCount,
    lastUpdated: Date.now(),
    loadDuration: Date.now() - startTime
  };
  pipeline.set(ACLKeys.METADATA, JSON.stringify(metadata), { EX: ONE_DAY });

  await pipeline.exec();

  // Notify DNS engine to flush its in-memory blocklist caches immediately
  await redisClient.publish('cache:invalidate', 'acl:reloaded');

  const duration = Date.now() - startTime;
  logger.info(`[ACL] Successfully loaded policies to Redis in ${duration}ms`);
  logger.info(`[ACL] Stats: ${metadata.expandedPolicies} policies, ${metadata.trackedIPs} IPs, ${metadata.globalBlocks} global blocks`);
  } finally {
    await redisClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
      { keys: [ACL_RELOAD_LOCK], arguments: [lockToken] },
    );
  }
}

/**
 * Force reload ACL policies to Redis (called on policy/domain group changes)
 * This ensures immediate updates without waiting for the cron job
 */
export async function forceReloadACLPolicies(): Promise<void> {
  try {
    await loadAccessControlPoliciesToRedis();
    logger.info('[ACL] Force reload completed successfully');
  } catch (error) {
    logger.error('[ACL] Error during force reload:', error);
    throw error;
  }
}

/**
 * Cron Job: Runs every 60 seconds to keep Redis in sync with MongoDB
 */
export const LoadAccessControlPoliciesCronJob = () => {
  Retry.Seconds(async () => {
    try {
      await loadAccessControlPoliciesToRedis();
    } catch (error) {
      logger.error('[ACL] Error loading policies to Redis:', error);
    }
  }, 60, true); // Run every 60 seconds, run immediately on start
};
