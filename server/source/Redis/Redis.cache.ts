/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';

import { Console } from 'outers';



/**

 * Redis Cache Service with Connection Pooling

 * Provides high-performance generic key-value caching

 */

class RedisCacheService {

  private static instance: RedisCacheService;

  private client: RedisClientType | null = null;

  private isConnecting = false;

  private reconnectAttempts = 0;

  private readonly MAX_RECONNECT_ATTEMPTS = 10;



  private constructor() { }



  /**

   * Get singleton instance

   */

  public static getInstance(): RedisCacheService {

    if (!RedisCacheService.instance) {

      RedisCacheService.instance = new RedisCacheService();

    }

    return RedisCacheService.instance;

  }



  /**

   * Initialize Redis connection with pooling

   */

  public async connect(): Promise<RedisClientType> {

    // Return existing connection if available

    if (this.client && this.client.isOpen) {

      return this.client;

    }



    // Prevent multiple simultaneous connection attempts

    if (this.isConnecting) {

      await this.waitForConnection();

      return this.client!;

    }



    this.isConnecting = true;



    try {

      const redisConfig = this.getRedisConfig();



      Console.bright("📡 Connecting to Redis...");

      Console.bright(`   Mode: ${redisConfig.mode}`);



      this.client = createClient(redisConfig.options);



      // Setup event handlers

      this.setupEventHandlers();



      // Connect

      await this.client.connect();



      Console.green("✅ Connected to Redis successfully!");

      Console.bright(`   Memory Policy: allkeys-lru`);

      Console.bright(`   Max Memory: 256MB`);



      this.reconnectAttempts = 0;

      return this.client;



    } catch (error) {

      Console.red("❌ Failed to connect to Redis:", error);

      throw error;

    } finally {

      this.isConnecting = false;

    }

  }



  /**

   * Get Redis configuration based on environment

   */

  private getRedisConfig(): { mode: string; options: any } {

    // Standalone mode (default)

    const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';



    return {

      mode: 'standalone',

      options: {

        url: redisUrl,

        socket: {

          reconnectStrategy: (retries: number) => {

            if (retries > this.MAX_RECONNECT_ATTEMPTS) {

              Console.red(`❌ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);

              return new Error('Max reconnection attempts reached');

            }

            const delay = Math.min(retries * 50, 500);

            Console.yellow(`⏳ Reconnecting to Redis in ${delay}ms (attempt ${retries})`);

            return delay;

          },

          connectTimeout: 10000

        }

      }

    };

  }



  /**

   * Setup Redis event handlers

   */

  private setupEventHandlers(): void {

    if (!this.client) return;



    this.client.on('connect', () => {

      Console.green('🔵 Redis client connecting...');

    });



    this.client.on('ready', () => {

      Console.green('🟢 Redis client ready!');

      this.reconnectAttempts = 0;

    });



    this.client.on('error', (err) => {

      Console.red('❌ Redis error:', err);

      this.reconnectAttempts++;

    });



    this.client.on('reconnecting', () => {

      Console.yellow('🔄 Redis client reconnecting...');

    });



    this.client.on('end', () => {

      Console.yellow('🔴 Redis connection closed');

    });

  }



  /**

   * Wait for ongoing connection attempt

   */

  private async waitForConnection(): Promise<void> {

    const maxWait = 30000; // 30 seconds

    const checkInterval = 100;

    let waited = 0;



    while (this.isConnecting && waited < maxWait) {

      await new Promise(resolve => setTimeout(resolve, checkInterval));

      waited += checkInterval;

    }



    if (waited >= maxWait) {

      throw new Error("Timeout waiting for Redis connection");

    }

  }



  // ============================================

  // GENERIC CRUD METHODS

  // ============================================



  /**

   * Set a key-value pair with optional TTL
  @example ttl=60 Default

   */

  async set(key: string, value: any, ttl=60): Promise<void> {

    try {

      if (!this.client) await this.connect();

      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);



      if (ttl) {

        await this.client!.setEx(key, ttl, serializedValue);

      } else {

        await this.client!.set(key, serializedValue);

      }

    } catch (error) {

      Console.yellow(`⚠️  Failed to set key ${key}:`, error);

    }

  }



  /**

   * Get a value by key

   */

  async get<T = any>(key: string): Promise<T | null> {

    try {

      if (!this.client) await this.connect();

      const cached = await this.client!.get(key);



      if (!cached) return null;



      // Try to parse as JSON, if fails return as string

      try {

        return JSON.parse(cached);

      } catch {

        return cached as T;

      }

    } catch (error) {

      Console.yellow(`⚠️  Failed to get key ${key}:`, error);

      return null;

    }

  }



  /**

   * Delete a key

   */

  async delete(key: string): Promise<boolean> {

    try {

      if (!this.client) await this.connect();

      const result = await this.client!.del(key);

      return result > 0;

    } catch (error) {

      Console.yellow(`⚠️  Failed to delete key ${key}:`, error);

      return false;

    }

  }



  /**

   * Check if a key exists

   */

  async exists(key: string): Promise<boolean> {

    try {

      if (!this.client) await this.connect();

      const result = await this.client!.exists(key);

      return result > 0;

    } catch (error) {

      Console.yellow(`⚠️  Failed to check existence of key ${key}:`, error);

      return false;

    }

  }



  /**

   * Delete keys matching a pattern

   */

  async invalidate(pattern: string): Promise<number> {

    try {

      if (!this.client) await this.connect();

      const keys = await this.client!.keys(pattern);



      if (keys.length > 0) {

        await this.client!.del(keys);

        Console.bright(`🗑️  Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);

        return keys.length;

      }



      return 0;

    } catch (error) {

      Console.yellow(`⚠️  Failed to invalidate pattern ${pattern}:`, error);

      return 0;

    }

  }



  /**

   * Get TTL (time to live) for a key in seconds

   */

  async getTTL(key: string): Promise<number> {

    try {

      if (!this.client) await this.connect();

      return await this.client!.ttl(key);

    } catch (error) {

      Console.yellow(`⚠️  Failed to get TTL for key ${key}:`, error);

      return -1;

    }

  }



  /**

   * Set expiration time for a key

   */

  async expire(key: string, seconds: number): Promise<number> {

    try {

      if (!this.client) await this.connect();

      const result = await this.client!.expire(key, seconds);

      return result;

    } catch (error) {

      Console.yellow(`⚠️  Failed to set expiration for key ${key}:`, error);

      return 0;

    }

  }



  /**

   * Clear all cache

   */

  async flushAll(): Promise<void> {

    try {

      if (!this.client) await this.connect();

      await this.client!.flushAll();

      Console.green('✅ All cache cleared!');

    } catch (error) {

      Console.red('❌ Failed to clear cache:', error);

    }

  }



  /**

   * Get cache statistics

   */

  async getStats(): Promise<any> {

    try {

      if (!this.client) await this.connect();

      // Get different sections of info
      const [statsInfo, memoryInfo, clientsInfo, keyspaceInfo] = await Promise.all([
        this.client!.info('stats'),
        this.client!.info('memory'),
        this.client!.info('clients'),
        this.client!.info('keyspace')
      ]);

      // Parse info strings
      const stats: any = {};

      const parseInfo = (info: string) => {
        info.split('\r\n').forEach(line => {
          // Skip comments and empty lines
          if (line.startsWith('#') || !line.trim()) return;

          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            stats[key] = value;
          }
        });
      };

      parseInfo(statsInfo);
      parseInfo(memoryInfo);
      parseInfo(clientsInfo);
      parseInfo(keyspaceInfo);

      // Count total keys across all databases
      let totalKeys = 0;
      Object.keys(stats).forEach(key => {
        if (key.startsWith('db')) {
          // Parse format like: "keys=123,expires=45,avg_ttl=3600"
          const match = stats[key].match(/keys=(\d+)/);
          if (match) {
            totalKeys += parseInt(match[1]);
          }
        }
      });

      return {
        connected_clients: parseInt(stats.connected_clients || '0'),
        used_memory: stats.used_memory_human || '0B',
        used_memory_peak: stats.used_memory_peak_human || '0B',
        total_commands_processed: parseInt(stats.total_commands_processed || '0'),
        keyspace_hits: parseInt(stats.keyspace_hits || '0'),
        keyspace_misses: parseInt(stats.keyspace_misses || '0'),
        total_keys: totalKeys,
        hit_rate: this.calculateHitRate(stats.keyspace_hits || '0', stats.keyspace_misses || '0')
      };

    } catch (error) {

      Console.red('❌ Failed to get cache stats:', error);

      return null;

    }

  }



  /**

   * Get all cached records with details

   */

  async getAllRecords(pattern: string = '*', limit: number = 1000): Promise<any[]> {

    try {

      if (!this.client) await this.connect();

      const keys = await this.client!.keys(pattern);

      const records = [];

      // Limit to prevent overwhelming the system
      const keysToProcess = keys.slice(0, limit);

      for (const key of keysToProcess) {
        const [value, ttl, type] = await Promise.all([
          this.client!.get(key),
          this.client!.ttl(key),
          this.client!.type(key)
        ]);

        // Calculate approximate size
        const size = value ? Buffer.byteLength(value, 'utf8') : 0;

        records.push({
          key,
          value,
          ttl,
          type,
          size: `${size} bytes`,
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null
        });
      }

      return records;

    } catch (error) {

      Console.red('❌ Failed to get all records:', error);

      return [];

    }

  }



  /**

   * Delete a specific cache entry by key

   */

  async deleteCacheEntry(key: string): Promise<boolean> {

    try {

      if (!this.client) await this.connect();

      const result = await this.client!.del(key);

      if (result > 0) {
        Console.green(`✅ Cache entry deleted: ${key}`);
        return true;
      }
      return false;

    } catch (error) {

      Console.red(`❌ Failed to delete cache entry ${key}:`, error);

      return false;

    }

  }



  /**

   * Calculate cache hit rate

   */

  private calculateHitRate(hits: string, misses: string): string {

    const h = parseInt(hits) || 0;

    const m = parseInt(misses) || 0;

    const total = h + m;

    if (total === 0) return '0%';

    return `${((h / total) * 100).toFixed(2)}%`;

  }



  /**

   * Close Redis connection

   */

  async close(): Promise<void> {

    if (this.client) {

      Console.bright('🔌 Closing Redis connection...');

      await this.client.quit();

      this.client = null;

      Console.green('✅ Redis connection closed');

    }

  }

}



// Export singleton instance

export default RedisCacheService.getInstance();



// Graceful shutdown

process.on('SIGINT', async () => {

  await RedisCacheService.getInstance().close();

});



process.on('SIGTERM', async () => {

  await RedisCacheService.getInstance().close();

});