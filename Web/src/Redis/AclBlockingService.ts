/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../utilities/logger';
import { RedisConnectionManager, ACLKeys } from 'nexoraldns-shared';

export class AclBlockingService {
  constructor(private connectionManager: RedisConnectionManager) {}

  async getBlockedDomainsForIP(ip: string): Promise<string[]> {
    try {
      const client = await this.connectionManager.getClient();
      const [exact, wild] = await Promise.all([
        client.sMembers(ACLKeys.exactIp(ip)),
        client.sMembers(ACLKeys.wildIp(ip)),
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
        client.sMembers(ACLKeys.EXACT_GLOBAL),
        client.sMembers(ACLKeys.WILD_GLOBAL),
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
      const metadata = await client.get(ACLKeys.METADATA);
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
        client.sIsMember(ACLKeys.exactIp(ip), domain),
        client.sIsMember(ACLKeys.EXACT_GLOBAL, domain),
      ]);
      if (ipExact || globalExact) return true;

      // Slow path: only the (typically small) wildcard sets are scanned.
      const [ipWild, globalWild] = await Promise.all([
        client.sMembers(ACLKeys.wildIp(ip)),
        client.sMembers(ACLKeys.WILD_GLOBAL),
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
