import InputOutputHandler from "../../utilities/IO.utls";
import RedisCache from "../../Redis/Redis.cache";
import dgram from "dgram";

/**
 * BlockList Service
 *
 * Handles Access Control List (ACL) checks for DNS queries
 * Uses Redis to store and query blocked domains per IP
 */
export default class BlockList {
  private readonly IO: InputOutputHandler;
  private readonly msg: Buffer<ArrayBufferLike>;
  private readonly rinfo: dgram.RemoteInfo;
  private readonly clientIP: string;

  // In-memory cache for recently checked domains (per instance)
  private readonly localCache: Map<string, { blocked: boolean; timestamp: number }>;
  private readonly CACHE_TTL = 5000; // 5 seconds local cache

  // Shared cache across all instances (class-level)
  private static globalCache: Map<string, { blocked: boolean; timestamp: number }> = new Map();
  private static GLOBAL_CACHE_TTL = 3000; // 3 seconds

  constructor(IO: InputOutputHandler, msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo) {
    this.IO = IO;
    this.msg = msg;
    this.rinfo = rinfo;
    this.clientIP = rinfo.address;
    this.localCache = new Map();
  }

  /**
   * Clear all in-memory caches (both instance and global)
   * This should be called when ACL policies are updated
   */
  public static clearAllCaches(): void {
    BlockList.globalCache.clear();
    console.log('[BlockList] Cleared all in-memory caches');
  }

  /**
   * Check if a domain should be blocked for the client IP
   * Uses multi-layer caching for optimal performance:
   * 1. In-memory cache (5s TTL) - fastest, ~5 microseconds
   * 2. Redis cache (loaded by cron) - fast, ~1ms
   *
   * @param domain Domain name to check (e.g., "facebook.com")
   * @returns true if blocked, false if allowed
   */
  public async checkDomain(domain: string): Promise<boolean> {
    // Normalize domain to lowercase
    const normalizedDomain = domain.toLowerCase();
    const cacheKey = `${this.clientIP}:${normalizedDomain}`;

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
      const isBlocked = await RedisCache.isDomainBlocked(this.clientIP, normalizedDomain);

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
      console.error(`[ACL] Error checking domain ${normalizedDomain} for IP ${this.clientIP}:`, error);
      // Fail open (allow on error) to prevent blocking all traffic
      return false;
    }
  }

  /**
   * Check if a domain is blocked and get details
   * @param domain Domain name to check
   * @returns Object with blocked status and reason
   */
  public async checkDomainWithDetails(domain: string): Promise<{
    blocked: boolean;
    reason?: string;
    checkedAt: number;
  }> {
    const normalizedDomain = domain.toLowerCase();
    const isBlocked = await this.checkDomain(normalizedDomain);

    return {
      blocked: isBlocked,
      reason: isBlocked ? 'Access Control Policy' : undefined,
      checkedAt: Date.now()
    };
  }

  /**
   * Get all blocked domains for the current client IP
   * Useful for debugging and diagnostics
   * @returns Array of blocked domain patterns
   */
  public async getBlockedDomainsForClient(): Promise<string[]> {
    try {
      const [ipBlocks, globalBlocks] = await Promise.all([
        RedisCache.getBlockedDomainsForIP(this.clientIP),
        RedisCache.getGloballyBlockedDomains()
      ]);

      return [...new Set([...ipBlocks, ...globalBlocks])]; // Remove duplicates
    } catch (error) {
      console.error(`[ACL] Error getting blocked domains for IP ${this.clientIP}:`, error);
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
      const metadata = await RedisCache.getACLMetadata();
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
   * Get the client IP address
   * @returns Client IP address
   */
  public getClientIP(): string {
    return this.clientIP;
  }

  /**
   * Batch check multiple domains (for optimization)
   * @param domains Array of domain names to check
   * @returns Map of domain -> blocked status
   */
  public async checkDomainsBatch(domains: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Check all domains in parallel
    await Promise.all(
      domains.map(async (domain) => {
        const isBlocked = await this.checkDomain(domain);
        results.set(domain, isBlocked);
      })
    );

    return results;
  }
}