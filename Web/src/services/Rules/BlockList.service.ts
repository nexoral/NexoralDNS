import container from '../../container/appContainer';
import { RedisCacheService } from '../../Redis/Redis.cache';

/**
 * BlockList Service
 *
 * Handles Access Control List (ACL) checks for DNS queries
 * Uses Redis to store and query blocked domains per IP
 */
export default class BlockList {
  private static instance: BlockList;

  private readonly localCache: Map<string, { blocked: boolean; timestamp: number }>;
  private readonly CACHE_TTL = 5000;

  private static globalCache: Map<string, { blocked: boolean; timestamp: number }> = new Map();
  private static GLOBAL_CACHE_TTL = 3000;

  constructor() {
    this.localCache = new Map();
    BlockList.instance = this;
  }

  public static clearAllCaches(): void {
    BlockList.globalCache.clear();
    BlockList.instance?.localCache.clear();
    console.log('[BlockList] Cleared all in-memory caches');
  }

  /**
   * Check if a domain should be blocked for the client IP
   * Uses multi-layer caching for optimal performance:
   * 1. In-memory cache (5s TTL) - fastest, ~5 microseconds
   * 2. Redis cache (loaded by cron) - fast, ~1ms
   *
   * @param domain Domain name to check (e.g., "facebook.com")
   * @param clientIP The client's IP address
   * @returns true if blocked, false if allowed
   */
  public async checkDomain(domain: string, clientIP: string): Promise<boolean> {
    // Normalize domain to lowercase
    const normalizedDomain = domain.toLowerCase();
    const cacheKey = `${clientIP}:${normalizedDomain}`;

    // Layer 1: Check global cache (shared across instances)
    const globalCached = BlockList.globalCache.get(cacheKey);
    if (globalCached && (Date.now() - globalCached.timestamp) < BlockList.GLOBAL_CACHE_TTL) {
      return globalCached.blocked;
    }

    // Layer 2: Check instance cache
    const localCached = this.localCache.get(cacheKey);
    if (localCached && (Date.now() - localCached.timestamp) < this.CACHE_TTL) {
      return localCached.blocked;
    }

    // Layer 3: Check Redis (ACL policies loaded by cron)
    try {
      const isBlocked = await container.get<RedisCacheService>('RedisCacheService').isDomainBlocked(clientIP, normalizedDomain);

      // Update both caches
      const cacheEntry = {
        blocked: isBlocked,
        timestamp: Date.now()
      };

      this.localCache.set(cacheKey, cacheEntry);
      BlockList.globalCache.set(cacheKey, cacheEntry);

      // Clean up old cache entries if cache gets too large
      if (this.localCache.size > 1000) {
        this.cleanLocalCache();
      }
      if (BlockList.globalCache.size > 10000) {
        BlockList.cleanGlobalCache();
      }

      return isBlocked;

    } catch (error) {
      console.error(`[ACL] Error checking domain ${normalizedDomain} for IP ${clientIP}:`, error);
      // Fail open (allow on error) to prevent blocking all traffic
      return false;
    }
  }

  /**
   * Check if a domain is blocked and get details
   * @param domain Domain name to check
   * @param clientIP The client's IP address
   * @returns Object with blocked status and reason
   */
  public async checkDomainWithDetails(domain: string, clientIP: string): Promise<{
    blocked: boolean;
    reason?: string;
    checkedAt: number;
  }> {
    const normalizedDomain = domain.toLowerCase();
    const isBlocked = await this.checkDomain(normalizedDomain, clientIP);

    return {
      blocked: isBlocked,
      reason: isBlocked ? 'Access Control Policy' : undefined,
      checkedAt: Date.now()
    };
  }

  /**
   * Get all blocked domains for the current client IP
   * Useful for debugging and diagnostics
   * @param clientIP The client's IP address
   * @returns Array of blocked domain patterns
   */
  public async getBlockedDomainsForClient(clientIP: string): Promise<string[]> {
    try {
      const [ipBlocks, globalBlocks] = await Promise.all([
        container.get<RedisCacheService>('RedisCacheService').getBlockedDomainsForIP(clientIP),
        container.get<RedisCacheService>('RedisCacheService').getGloballyBlockedDomains()
      ]);

      return [...new Set([...ipBlocks, ...globalBlocks])]; // Remove duplicates
    } catch (error) {
      console.error(`[ACL] Error getting blocked domains for IP ${clientIP}:`, error);
      return [];
    }
  }

  /**
   * Get ACL statistics and metadata
   * @returns ACL metadata object
   */
  public async getACLStats(): Promise<{
    totalPolicies: number;
    expandedPolicies: number;
    trackedIPs: number;
    globalBlocks: number;
    lastUpdated: number;
    loadDuration: number;
  } | null> {
    try {
      const metadata = await container.get<RedisCacheService>('RedisCacheService').getACLMetadata();
      return metadata;
    } catch (error) {
      console.error('[ACL] Error getting ACL stats:', error);
      return null;
    }
  }

  /**
   * Clean up expired entries from local cache
   * Keeps cache size manageable
   */
  private cleanLocalCache(): void {
    const now = Date.now();
    for (const [key, value] of this.localCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Clean up expired entries from global cache
   * Keeps cache size manageable
   */
  public static cleanGlobalCache(): void {
    const now = Date.now();
    for (const [key, value] of BlockList.globalCache.entries()) {
      if (now - value.timestamp > BlockList.GLOBAL_CACHE_TTL) {
        BlockList.globalCache.delete(key);
      }
    }
  }

  /**
   * Batch check multiple domains (for optimization)
   * @param domains Array of domain names to check
   * @param clientIP The client's IP address
   * @returns Map of domain -> blocked status
   */
  public async checkDomainsBatch(domains: string[], clientIP: string): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Check all domains in parallel
    await Promise.all(
      domains.map(async (domain) => {
        const isBlocked = await this.checkDomain(domain, clientIP);
        results.set(domain, isBlocked);
      })
    );

    return results;
  }
}