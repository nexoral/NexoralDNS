/* eslint-disable @typescript-eslint/no-explicit-any */
import { Console } from 'outers';
import { RedisConnectionManager } from './RedisConnectionManager';

export class AclBlockingService {
  constructor(private connectionManager: RedisConnectionManager) {}

  async getBlockedDomainsForIP(ip: string): Promise<string[]> {
    try {
      const client = await this.connectionManager.getClient();
      const key = `acl:ip:${ip}`;
      const domains = await client.sMembers(key);
      return domains || [];
    } catch (error) {
      Console.yellow(`⚠️  Failed to get blocked domains for IP ${ip}:`, error);
      return [];
    }
  }

  async getGloballyBlockedDomains(): Promise<string[]> {
    try {
      const client = await this.connectionManager.getClient();
      const domains = await client.sMembers('acl:all_users');
      return domains || [];
    } catch (error) {
      Console.yellow(`⚠️  Failed to get globally blocked domains:`, error);
      return [];
    }
  }

  async getACLMetadata(): Promise<any> {
    try {
      const client = await this.connectionManager.getClient();
      const metadata = await client.get('acl:metadata');
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      Console.yellow(`⚠️  Failed to get ACL metadata:`, error);
      return null;
    }
  }

  async isDomainBlocked(ip: string, domain: string): Promise<boolean> {
    try {
      const [ipBlocks, globalBlocks] = await Promise.all([
        this.getBlockedDomainsForIP(ip),
        this.getGloballyBlockedDomains()
      ]);

      const allBlocks = [...ipBlocks, ...globalBlocks];

      for (const blockEntry of allBlocks) {
        let domainEntry: { domain: string; isWildcard: boolean };

        try {
          domainEntry = JSON.parse(blockEntry);
        } catch {
          domainEntry = {
            domain: blockEntry,
            isWildcard: blockEntry.startsWith('*.') || blockEntry.endsWith('.*') || blockEntry === '*'
          };
        }

        const blockedDomain = domainEntry.domain;
        const isWildcard = domainEntry.isWildcard;

        if (blockedDomain === '*') {
          return true;
        }

        if (isWildcard) {
          if (blockedDomain.startsWith('*.')) {
            const baseDomain = blockedDomain.substring(2);
            if (domain.endsWith(baseDomain) || domain === baseDomain) {
              return true;
            }
          }
          else if (blockedDomain.endsWith('.*')) {
            const basePrefix = blockedDomain.slice(0, -2);
            if (domain.startsWith(basePrefix)) {
              return true;
            }
          }
          else {
            if (domain.endsWith('.' + blockedDomain) || domain === blockedDomain) {
              return true;
            }
          }
        } else {
          if (domain === blockedDomain) {
            return true;
          }
        }
      }

      return false;

    } catch (error) {
      Console.yellow(`⚠️  Failed to check if domain ${domain} is blocked for IP ${ip}:`, error);
      return false;
    }
  }
}
