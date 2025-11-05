/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';

import { Console } from 'outers';



/**

 * Redis Cache Service with Connection Pooling

 * Provides high-performance caching for DNS queries

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

  // DNS CACHING METHODS

  // ============================================



  /**

   * Cache full DNS response (binary packet)

   */

  async cacheResponse(queryType: string, domain: string, response: Buffer, ttl: number): Promise<void> {

    try {

      if (!this.client) await this.connect();

      const key = `response:${queryType}:${domain.toLowerCase()}`;

      await this.client!.setEx(key, ttl, response);

    } catch (error) {

      Console.yellow(`⚠️  Failed to cache response for ${domain}:`, error);

    }

  }



  /**

   * Get cached DNS response

   */

  async getCachedResponse(queryType: string, domain: string): Promise<Buffer | null> {

    try {

      if (!this.client) await this.connect();

      const key = `response:${queryType}:${domain.toLowerCase()}`;

      const cached = await this.client!.get(key);

      return cached ? Buffer.from(cached) : null;

    } catch (error) {

      Console.yellow(`⚠️  Failed to get cached response for ${domain}:`, error);

      return null;

    }

  }



  /**

   * Cache DNS record (JSON)

   */

  async cacheDNSRecord(domain: string, record: any, ttl: number): Promise<void> {

    try {

      if (!this.client) await this.connect();

      const key = `dns:${domain.toLowerCase()}`;

      await this.client!.setEx(key, ttl, JSON.stringify(record));

    } catch (error) {

      Console.yellow(`⚠️  Failed to cache DNS record for ${domain}:`, error);

    }

  }



  /**

   * Get cached DNS record

   */

  async getDNSRecord(domain: string): Promise<any> {

    try {

      if (!this.client) await this.connect();

      const key = `dns:${domain.toLowerCase()}`;

      const cached = await this.client!.get(key);

      return cached ? JSON.parse(cached) : null;

    } catch (error) {

      Console.yellow(`⚠️  Failed to get cached DNS record for ${domain}:`, error);

      return null;

    }

  }



  /**

   * Maintain and cache service status (boolean)

   */

  async maintainServiceStatus(serviceName: string, isHealthy: boolean, ttl: number = 60): Promise<void> {

    try {

      if (!this.client) await this.connect();

      const key = `service:${serviceName}:status`;

      await this.client!.setEx(key, ttl, isHealthy ? 'true' : 'false');

    } catch (error) {

      Console.yellow(`⚠️  Failed to maintain service status for ${serviceName}:`, error);

    }

  }



  /**

   * Get service status (boolean)

   */

  async getServiceStatusBoolean(serviceName: string): Promise<boolean | null> {

    try {

      if (!this.client) await this.connect();

      const key = `service:${serviceName}:status`;

      const cached = await this.client!.get(key);

      return cached === 'true' ? true : cached === 'false' ? false : null;

    } catch (error) {

      Console.yellow(`⚠️  Failed to get service status for ${serviceName}:`, error);

      return null;

    }

  }



  /**

   * Cache service status (legacy - simple string)

   */

  async cacheServiceStatus(status: string, ttl: number = 60): Promise<void> {

    try {

      if (!this.client) await this.connect();

      await this.client!.setEx('service:status', ttl, status);

    } catch (error) {

      Console.yellow('⚠️  Failed to cache service status:', error);

    }

  }



  /**

   * Get cached service status (legacy - simple string)

   */

  async getServiceStatus(): Promise<string | null> {

    try {

      if (!this.client) await this.connect();

      return await this.client!.get('service:status');

    } catch (error) {

      Console.yellow('⚠️  Failed to get service status:', error);

      return null;

    }

  }



  /**

   * Invalidate domain cache

   */

  async invalidateDomain(domain: string): Promise<void> {

    try {

      if (!this.client) await this.connect();

      const pattern = `*${domain.toLowerCase()}*`;

      const keys = await this.client!.keys(pattern);

      if (keys.length > 0) {

        await this.client!.del(keys);

        Console.bright(`🗑️  Invalidated ${keys.length} cache entries for ${domain}`);

      }

    } catch (error) {

      Console.yellow(`⚠️  Failed to invalidate cache for ${domain}:`, error);

    }

  }



  /**

   * Invalidate service status cache

   */

  async invalidateServiceStatus(): Promise<void> {

    try {

      if (!this.client) await this.connect();

      await this.client!.del('service:status');

    } catch (error) {

      Console.yellow('⚠️  Failed to invalidate service status:', error);

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