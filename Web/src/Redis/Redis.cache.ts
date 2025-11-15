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

      const info = await this.client!.info();



      // Parse info string

      const stats: any = {};

      info.split('\r\n').forEach(line => {

        const [key, value] = line.split(':');

        if (key && value) {

          stats[key] = value;

        }

      });



      return {

        connected_clients: stats.connected_clients,

        used_memory: stats.used_memory_human,

        used_memory_peak: stats.used_memory_peak_human,

        total_commands_processed: stats.total_commands_processed,

        keyspace_hits: stats.keyspace_hits,

        keyspace_misses: stats.keyspace_misses,

        hit_rate: this.calculateHitRate(stats.keyspace_hits, stats.keyspace_misses)

      };

    } catch (error) {

      Console.red('❌ Failed to get cache stats:', error);

      return null;

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