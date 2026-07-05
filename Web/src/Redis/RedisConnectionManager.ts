/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';
import { Console } from 'outers';

export class RedisConnectionManager {
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

      Console.bright("📡 Connecting to Redis...");
      Console.bright(`   Mode: ${redisConfig.mode}`);

      this.client = createClient(redisConfig.options);

      this.setupEventHandlers();

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

  private getRedisConfig(): { mode: string; options: any } {
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
      Console.bright('🔌 Closing Redis connection...');
      await this.client.quit();
      this.client = null;
    }
    Console.green('✅ Redis connection closed');
  }
}
