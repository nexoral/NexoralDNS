import { Retry } from "outers";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import RedisCache from "../../Redis/Redis.cache";

/**
 * Redis Data Structure for Access Control Policies:
 *
 * 1. acl:ip:{IP_ADDRESS} -> Set of blocked domains
 *    Example: acl:ip:192.168.1.100 -> ["facebook.com", "instagram.com", "*.social.com"]
 *
 * 2. acl:all_users -> Set of blocked domains for all users
 *    Example: acl:all_users -> ["malware.com", "phishing.com"]
 *
 * 3. acl:metadata -> JSON with policy count, last updated timestamp
 */

interface ExpandedPolicy {
  policyName: string;
  targetIPs: string[];
  blockedDomains: string[];
  isActive: boolean;
}

/**
 * Load all Access Control Policies to Redis for fast DNS filtering
 * This runs every 60 seconds to keep policies in sync
 */
export async function loadAccessControlPoliciesToRedis(): Promise<void> {
  console.log('[ACL] Loading access control policies to Redis...');

  const startTime = Date.now();

  // Get MongoDB collections
  const policiesCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ACCESS_CONTROL_POLICIES);
  const ipGroupsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.IP_GROUPS);
  const domainGroupsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAIN_GROUPS);

  if (!policiesCollection || !ipGroupsCollection || !domainGroupsCollection) {
    throw new Error("Database collections not initialized");
  }

  // Fetch all active policies
  const activePolicies = await policiesCollection.find({ isActive: true }).toArray();
  console.log(`[ACL] Found ${activePolicies.length} active policies`);

  // Fetch all IP groups and Domain groups for expansion
  const [ipGroups, domainGroups] = await Promise.all([
    ipGroupsCollection.find({}).toArray(),
    domainGroupsCollection.find({}).toArray()
  ]);

  // Create lookup maps for quick access
  const ipGroupMap = new Map(ipGroups.map(g => [g._id.toString(), g.ipAddresses || []]));
  const domainGroupMap = new Map(domainGroups.map(g => [g._id.toString(), g.domains || []]));

  console.log(`[ACL] Loaded ${ipGroups.length} IP groups and ${domainGroups.length} domain groups`);

  // Expand all policies (resolve group references to actual IPs and domains)
  const expandedPolicies: ExpandedPolicy[] = [];

  for (const policy of activePolicies) {
    const targetIPs: string[] = [];
    const blockedDomains: string[] = [];

    // Expand target IPs
    switch (policy.targetType) {
      case 'all':
        targetIPs.push('*'); // Special marker for all users
        break;
      case 'single_ip':
        if (policy.targetIP) targetIPs.push(policy.targetIP);
        break;
      case 'multiple_ips':
        if (policy.targetIPs) targetIPs.push(...policy.targetIPs);
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

    // Expand blocked domains
    switch (policy.blockType) {
      case 'full_internet':
        blockedDomains.push('*'); // Block everything
        break;
      case 'specific_domains':
        if (policy.domains) blockedDomains.push(...policy.domains);
        break;
      case 'domain_group':
        if (policy.domainGroup) {
          const groupId = policy.domainGroup.toString();
          const domains = domainGroupMap.get(groupId) || [];
          blockedDomains.push(...domains);
        }
        break;
      case 'multiple_domain_groups':
        if (policy.domainGroups) {
          for (const groupId of policy.domainGroups) {
            const domains = domainGroupMap.get(groupId.toString()) || [];
            blockedDomains.push(...domains);
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

  console.log(`[ACL] Expanded ${expandedPolicies.length} policies`);

  // Build Redis data structure
  const ipToDomains = new Map<string, Set<string>>();
  const allUsersBlockedDomains = new Set<string>();

  for (const policy of expandedPolicies) {
    if (!policy.isActive) continue;

    for (const ip of policy.targetIPs) {
      if (ip === '*') {
        // Policy applies to all users
        for (const domain of policy.blockedDomains) {
          allUsersBlockedDomains.add(domain);
        }
      } else {
        // Policy applies to specific IP
        if (!ipToDomains.has(ip)) {
          ipToDomains.set(ip, new Set());
        }
        const domainSet = ipToDomains.get(ip)!;
        for (const domain of policy.blockedDomains) {
          domainSet.add(domain);
        }
      }
    }
  }

  console.log(`[ACL] Built lookup structure: ${ipToDomains.size} IPs, ${allUsersBlockedDomains.size} global blocks`);

  // Clear old ACL data in Redis (delete all acl:* keys)
  // Note: This is a simplified approach. In production, consider using Redis pipeline for atomic updates
  const redisClient = await RedisCache.getClient();

  // Delete old ACL keys (scan for acl:* pattern)
  const aclKeys = await redisClient.keys('acl:*');
  if (aclKeys.length > 0) {
    await redisClient.del(aclKeys);
    console.log(`[ACL] Cleared ${aclKeys.length} old ACL keys`);
  }

  // Write new data to Redis
  const pipeline = redisClient.multi();

  // Store global blocks (applies to all users)
  if (allUsersBlockedDomains.size > 0) {
    pipeline.sAdd('acl:all_users', Array.from(allUsersBlockedDomains));
    pipeline.expire('acl:all_users', 120); // 2 minutes TTL (refresh every 60s)
  }

  // Store IP-specific blocks
  for (const [ip, domains] of ipToDomains.entries()) {
    const key = `acl:ip:${ip}`;
    pipeline.sAdd(key, Array.from(domains));
    pipeline.expire(key, 120); // 2 minutes TTL
  }

  // Store metadata
  const metadata = {
    totalPolicies: activePolicies.length,
    expandedPolicies: expandedPolicies.length,
    trackedIPs: ipToDomains.size,
    globalBlocks: allUsersBlockedDomains.size,
    lastUpdated: Date.now(),
    loadDuration: Date.now() - startTime
  };
  pipeline.set('acl:metadata', JSON.stringify(metadata), { EX: 120 });

  // Execute all Redis commands
  await pipeline.exec();

  const duration = Date.now() - startTime;
  console.log(`[ACL]  Successfully loaded policies to Redis in ${duration}ms`);
  console.log(`[ACL] Stats: ${metadata.expandedPolicies} policies, ${metadata.trackedIPs} IPs, ${metadata.globalBlocks} global blocks`);
}

/**
 * Cron Job: Runs every 60 seconds to keep Redis in sync with MongoDB
 */
export const LoadAccessControlPoliciesCronJob = () => {
  Retry.Seconds(async () => {
    try {
      await loadAccessControlPoliciesToRedis();
    } catch (error) {
      console.error('[ACL] Error loading policies to Redis:', error);
    }
  }, 60, true); // Run every 60 seconds, run immediately on start
};
