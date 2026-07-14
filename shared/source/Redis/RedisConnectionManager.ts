/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';
import logger from '../utilities/logger';

// A new cache backend can implement this without touching RedisConnectionManager
export interface ICacheConnectionManager {
  connect(): Promise<unknown>;
  getClient(): Promise<unknown>;
  close(): Promise<void>;
}

export class RedisConnectionManager implements ICacheConnectionManager {
  private client: RedisClientType | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  async connect(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client;
    }

    if (this.isConnecting) {
      await this.waitForConnection();
      return this.client!;
    }

    this.isConnecting = true;

    try {
      const redisConfig = this.getRedisConfig();

      logger.info("📡 Connecting to Redis...");
      logger.info(`   Mode: ${redisConfig.mode}`);

      this.client = createClient(redisConfig.options);

      this.setupEventHandlers();

      await this.client.connect();

      logger.info("✅ Connected to Redis successfully!");
      logger.info(`   Memory Policy: allkeys-lru`);
      logger.info(`   Max Memory: 256MB`);

      this.reconnectAttempts = 0;
      return this.client;

    } catch (error) {
      logger.error("❌ Failed to connect to Redis:", error as any);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  getRedisConfig(): { mode: string; options: any } {
    const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';

    return {
      mode: 'standalone',
      options: {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > this.MAX_RECONNECT_ATTEMPTS) {
              logger.error(`❌ Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
              return new Error('Max reconnection attempts reached');
            }

            const delay = Math.min(retries * 50, 500);
            logger.warn(`⏳ Reconnecting to Redis in ${delay}ms (attempt ${retries})`);

            return delay;
          },
          connectTimeout: 10000
        }
      }
    };
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('🔵 Redis client connecting...');
    });

    this.client.on('ready', () => {
      logger.info('🟢 Redis client ready!');
      this.reconnectAttempts = 0;
    });

    this.client.on('error', (err) => {
      logger.error('❌ Redis error:', err as any);
      this.reconnectAttempts++;
    });

    this.client.on('reconnecting', () => {
      logger.warn('🔄 Redis client reconnecting...');
    });

    this.client.on('end', () => {
      logger.warn('🔴 Redis connection closed');
    });
  }

  private async waitForConnection(): Promise<void> {
    const maxWait = 30000;
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

  async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.client.isOpen) {
      await this.connect();
    }
    return this.client!;
  }

  async close(): Promise<void> {
    if (this.client) {
      logger.info('🔌 Closing Redis connection...');
      await this.client.quit();
      this.client = null;
    }
    logger.info('✅ Redis connection closed');
  }
}
