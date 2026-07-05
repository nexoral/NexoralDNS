/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, RedisClientType } from 'redis';
import logger from '../utilities/logger';
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
          logger.error('❌ Subscriber connection error:', err as any);
          this.subscriberClient = null;
        });

        this.subscriberClient.on('end', () => {
          logger.warn('🔴 Subscriber connection closed');
          this.subscriberClient = null;
        });

        await this.subscriberClient.connect();
        logger.info('📡 Connected to Redis Subscriber Client');
      }

      await this.subscriberClient.subscribe(channel, (message) => {
        callback(message);
      });
      logger.info(`👂 Subscribed to channel: ${channel}`);

    } catch (error) {
      logger.error(`❌ Failed to subscribe to channel ${channel}:`, error as any);
      this.subscriberClient = null;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.publish(channel, message);
    } catch (error) {
      logger.error(`❌ Failed to publish to channel ${channel}:`, error as any);
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
