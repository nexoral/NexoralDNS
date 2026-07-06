import logger from '../utilities/logger';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel, ConsumeMessage } from 'amqplib';
import { RabbitMQConnectionManager } from './RabbitMQConnectionManager';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';

export class RabbitMQConsumer {
  constructor(
    private connectionManager: RabbitMQConnectionManager,
    private queueManager: RabbitMQQueueManager
  ) {}

  async consume(
    queue: string,
    callback: (message: any) => Promise<boolean>,
    options?: {
      prefetch?: number;
      noAck?: boolean;
    }
  ): Promise<void> {
    try {
      const channel = await this.connectionManager.connect();
      await this.queueManager.ensureQueue(queue);

      await channel.prefetch(options?.prefetch ?? 1);

      logger.info(`🔵 Started consuming from queue: ${queue}`);

      await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const messageData = JSON.parse(msg.content.toString());

            const success = await callback(messageData);

            if (success) {
              channel.ack(msg);
              logger.info(`✅ Message processed and acknowledged from queue: ${queue}`);
            } else {
              channel.nack(msg, false, true);
              logger.warn(`⚠️  Message processing failed, requeued: ${queue}`);
            }

          } catch (error) {
            logger.error(`❌ Error processing message from queue ${queue}:`, error);
            channel.nack(msg, false, true);
          }
        },
        {
          noAck: options?.noAck ?? false,
        }
      );

    } catch (error) {
      logger.error(`❌ Failed to start consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeBatch(
    queue: string,
    batchCallback: (messages: any[]) => Promise<boolean>,
    options?: {
      batchSize?: number;
      batchTimeout?: number;
    }
  ): Promise<void> {
    const batchSize = options?.batchSize ?? 100;
    const batchTimeout = options?.batchTimeout ?? 60000;

    let messageBatch: { msg: ConsumeMessage; data: any }[] = [];
    let batchTimer: NodeJS.Timeout | null = null;

    const processBatch = async (channel: Channel) => {
      if (messageBatch.length === 0) return;

      const currentBatch = [...messageBatch];
      messageBatch = [];

      try {
        logger.info(`📦 Processing batch of ${currentBatch.length} messages from queue: ${queue}`);

        const messages = currentBatch.map((item) => item.data);

        const success = await batchCallback(messages);

        if (success) {
          currentBatch.forEach((item) => channel.ack(item.msg));
          logger.info(`✅ Batch of ${currentBatch.length} messages processed successfully`);
        } else {
          currentBatch.forEach((item) => channel.nack(item.msg, false, true));
          logger.warn(`⚠️  Batch processing failed, messages requeued`);
        }

      } catch (error) {
        logger.error(`❌ Error processing batch from queue ${queue}:`, error);
        currentBatch.forEach((item) => channel.nack(item.msg, false, true));
      }
    };

    try {
      const channel = await this.connectionManager.connect();
      await this.queueManager.ensureQueue(queue);

      await channel.prefetch(batchSize);

      logger.info(`🔵 Started batch consumer for queue: ${queue} (batch size: ${batchSize})`);

      await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const messageData = JSON.parse(msg.content.toString());
            messageBatch.push({ msg, data: messageData });

            if (batchTimer) clearTimeout(batchTimer);

            if (messageBatch.length >= batchSize) {
              await processBatch(channel);
            } else {
              batchTimer = setTimeout(async () => {
                await processBatch(channel);
              }, batchTimeout);
            }

          } catch (error) {
            logger.error(`❌ Error adding message to batch from queue ${queue}:`, error);
            channel.nack(msg, false, true);
          }
        },
        {
          noAck: false,
        }
      );

    } catch (error) {
      logger.error(`❌ Failed to start batch consumer for queue ${queue}:`, error);
      throw error;
    }
  }
}
