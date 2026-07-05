/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';
import { Console } from 'outers';
import { RedisConnectionManager } from './RedisConnectionManager';

export class RedisPubSub {
  private subscriberClient: RedisClientType | null = null;

  constructor(private connectionManager: RedisConnectionManager, private getRedisConfig: () => { mode: string; options: any }) {}

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      // Check if subscriber client exists and is still connected
      if (!this.subscriberClient || !this.subscriberClient.isOpen) {
        if (this.subscriberClient) {
          try {
            await this.subscriberClient.quit();
          } catch {
            // Already closed
          }
        }

        const redisConfig = this.getRedisConfig();
        this.subscriberClient = createClient(redisConfig.options);

        this.subscriberClient.on('error', (err) => {
          Console.red('❌ Subscriber connection error:', err);
          this.subscriberClient = null;
        });

        this.subscriberClient.on('end', () => {
          Console.yellow('🔴 Subscriber connection closed');
          this.subscriberClient = null;
        });

        await this.subscriberClient.connect();
        Console.green('📡 Connected to Redis Subscriber Client');
      }

      await this.subscriberClient.subscribe(channel, (message) => {
        callback(message);
      });
      Console.bright(`👂 Subscribed to channel: ${channel}`);

    } catch (error) {
      Console.red(`❌ Failed to subscribe to channel ${channel}:`, error);
      this.subscriberClient = null;
      throw error;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.publish(channel, message);
    } catch (error) {
      Console.red(`❌ Failed to publish to channel ${channel}:`, error);
      return 0;
    }
  }

  async close(): Promise<void> {
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
      this.subscriberClient = null;
    }
  }
}
