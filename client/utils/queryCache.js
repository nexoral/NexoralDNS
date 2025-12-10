/**
 * Query Cache Utility
 * Provides in-memory caching with TTL for API query results
 */

class QueryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxSize = 100; // Maximum cache entries
  }

  /**
   * Generate cache key from params
   */
  generateKey(params) {
    return JSON.stringify(params);
  }

  /**
   * Get cached data
   */
  get(params) {
    const key = this.generateKey(params);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache data
   */
  set(params, data, customTTL = null) {
    const key = this.generateKey(params);
    const ttl = customTTL || this.ttl;

    // Implement LRU: Remove oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      timestamp: Date.now()
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(params) {
    const key = this.generateKey(params);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()).length
    };
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(patternFn) {
    const keysToDelete = [];

    for (const [key] of this.cache.entries()) {
      const params = JSON.parse(key);
      if (patternFn(params)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }
}

// Create singleton instance
const queryCache = new QueryCache();

export default queryCache;
