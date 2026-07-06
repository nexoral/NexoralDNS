import logger from '../utilities/logger';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RabbitMQConnectionManager } from './RabbitMQConnectionManager';

export class RabbitMQQueueManager {
  private readonly assertedQueues: Set<string> = new Set();

  constructor(private connectionManager: RabbitMQConnectionManager) {}

  async ensureQueue(queue: string): Promise<void> {
    if (this.assertedQueues.has(queue)) return;

    const channel = await this.connectionManager.connect();
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-max-priority': 10,
      },
    });

    this.assertedQueues.add(queue);
  }

  async getQueueMessageCount(queue: string): Promise<number> {
    try {
      await this.ensureQueue(queue);
      const channel = await this.connectionManager.connect();
      const queueInfo = await channel.checkQueue(queue);
      return queueInfo.messageCount;
    } catch (error) {
      logger.error(`❌ Failed to get message count for queue ${queue}:`, error);
      return -1;
    }
  }

  async purgeQueue(queue: string): Promise<boolean> {
    try {
      const channel = await this.connectionManager.connect();
      await channel.purgeQueue(queue);
      logger.info(`✅ Purged all messages from queue: ${queue}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to purge queue ${queue}:`, error);
      return false;
    }
  }

  async deleteQueue(queue: string): Promise<boolean> {
    try {
      const channel = await this.connectionManager.connect();
      await channel.deleteQueue(queue);
      logger.info(`✅ Deleted queue: ${queue}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to delete queue ${queue}:`, error);
      return false;
    }
  }
}
