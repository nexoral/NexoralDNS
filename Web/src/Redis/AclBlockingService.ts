/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../utilities/logger';
import { RedisConnectionManager } from './RedisConnectionManager';

export class AclBlockingService {
  constructor(private connectionManager: RedisConnectionManager) {}

  // ACL storage is split into two sets per scope so exact matches are O(1):
  //   acl:ip:{ip}:exact / acl:all_users:exact   -> plain domain strings (SISMEMBER)
  //   acl:ip:{ip}:wild  / acl:all_users:wild    -> JSON wildcard entries (scanned)
  private exactIpKey(ip: string): string { return `acl:ip:${ip}:exact`; }
  private wildIpKey(ip: string): string { return `acl:ip:${ip}:wild`; }
  private readonly EXACT_GLOBAL_KEY = 'acl:all_users:exact';
  private readonly WILD_GLOBAL_KEY = 'acl:all_users:wild';

  async getBlockedDomainsForIP(ip: string): Promise<string[]> {
    try {
      const client = await this.connectionManager.getClient();
      const [exact, wild] = await Promise.all([
        client.sMembers(this.exactIpKey(ip)),
        client.sMembers(this.wildIpKey(ip)),
      ]);
      return [...(exact || []), ...(wild || [])];
    } catch (error) {
      logger.warn(`⚠️  Failed to get blocked domains for IP ${ip}:`, error as any);
      return [];
    }
  }

  async getGloballyBlockedDomains(): Promise<string[]> {
    try {
      const client = await this.connectionManager.getClient();
      const [exact, wild] = await Promise.all([
        client.sMembers(this.EXACT_GLOBAL_KEY),
        client.sMembers(this.WILD_GLOBAL_KEY),
      ]);
      return [...(exact || []), ...(wild || [])];
    } catch (error) {
      logger.warn(`⚠️  Failed to get globally blocked domains:`, error as any);
      return [];
    }
  }

  async getACLMetadata(): Promise<any> {
    try {
      const client = await this.connectionManager.getClient();
      const metadata = await client.get('acl:metadata');
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      logger.warn(`⚠️  Failed to get ACL metadata:`, error as any);
      return null;
    }
  }

  async isDomainBlocked(ip: string, domain: string): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();

      // Fast path: O(1) exact-match membership tests (no full-set fetch/scan).
      const [ipExact, globalExact] = await Promise.all([
        client.sIsMember(this.exactIpKey(ip), domain),
        client.sIsMember(this.EXACT_GLOBAL_KEY, domain),
      ]);
      if (ipExact || globalExact) return true;

      // Slow path: only the (typically small) wildcard sets are scanned.
      const [ipWild, globalWild] = await Promise.all([
        client.sMembers(this.wildIpKey(ip)),
        client.sMembers(this.WILD_GLOBAL_KEY),
      ]);

      for (const entry of [...(ipWild || []), ...(globalWild || [])]) {
        if (this.matchesWildcard(entry, domain)) return true;
      }

      return false;

    } catch (error) {
      logger.warn(`⚠️  Failed to check if domain ${domain} is blocked for IP ${ip}:`, error as any);
      return false;
    }
  }

  /**
   * Boundary-aware wildcard matching for a single stored wildcard entry.
   * Blocks a domain and its subdomains only — never look-alike domains.
   */
  private matchesWildcard(rawEntry: string, domain: string): boolean {
    let blockedDomain: string;
    try {
      blockedDomain = (JSON.parse(rawEntry) as { domain: string }).domain;
    } catch {
      blockedDomain = rawEntry;
    }

    if (blockedDomain === '*') return true; // full-internet block

    if (blockedDomain.startsWith('*.')) {
      const baseDomain = blockedDomain.substring(2);
      // `*.example.com` blocks example.com + subdomains, NOT notexample.com.
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }

    if (blockedDomain.endsWith('.*')) {
      const basePrefix = blockedDomain.slice(0, -2);
      // `google.*` blocks google.com / google.co.uk, NOT googlexyz.com.
      return domain === basePrefix || domain.startsWith(basePrefix + '.');
    }

    // Bare domain stored as wildcard: treat as domain + subdomains.
    return domain === blockedDomain || domain.endsWith('.' + blockedDomain);
  }
}
