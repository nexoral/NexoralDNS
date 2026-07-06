/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '../utilities/logger';
import { RabbitMQConnectionManager } from './RabbitMQConnectionManager';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';

export class RabbitMQPublisher {
  constructor(
    private connectionManager: RabbitMQConnectionManager,
    private queueManager: RabbitMQQueueManager
  ) {}

  async publish(
    queue: string,
    message: any,
    options?: {
      persistent?: boolean;
      priority?: number;
      expiration?: string;
    }
  ): Promise<boolean> {
    try {
      const channel = await this.connectionManager.connect();
      await this.queueManager.ensureQueue(queue);

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sent = channel.sendToQueue(queue, messageBuffer, {
        persistent: options?.persistent ?? true,
        priority: options?.priority ?? 5,
        expiration: options?.expiration,
      });

      if (sent) {
        logger.info(`📤 Published message to queue: ${queue}`);
      } else {
        logger.warn(`⚠️  Queue ${queue} is full, message buffered`);
      }

      return sent;

    } catch (error) {
      logger.error(`❌ Failed to publish to queue ${queue}:`, error as any);
      return false;
    }
  }

  async publishBatch(queue: string, messages: any[]): Promise<number> {
    let successCount = 0;

    try {
      const channel = await this.connectionManager.connect();
      await this.queueManager.ensureQueue(queue);

      for (const message of messages) {
        const messageBuffer = Buffer.from(JSON.stringify(message));
        const sent = channel.sendToQueue(queue, messageBuffer, { persistent: true });
        if (sent) successCount++;
      }

      logger.info(`📤 Published ${successCount}/${messages.length} messages to queue: ${queue}`);

    } catch (error) {
      logger.error(`❌ Failed to publish batch to queue ${queue}:`, error as any);
    }

    return successCount;
  }
}
