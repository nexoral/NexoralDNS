/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';
import { Console } from 'outers';

export class RedisPubSub {
  private subscriberClient: RedisClientType | null = null;

  constructor(private client: RedisClientType, private getRedisConfig: () => { mode: string; options: any }) {}

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      if (!this.subscriberClient) {
        const redisConfig = this.getRedisConfig();
        this.subscriberClient = createClient(redisConfig.options);
        await this.subscriberClient.connect();
        Console.green('📡 Connected to Redis Subscriber Client');
      }

      await this.subscriberClient.subscribe(channel, (message) => {
        callback(message);
      });
      Console.bright(`👂 Subscribed to channel: ${channel}`);

    } catch (error) {
      Console.red(`❌ Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message);
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
