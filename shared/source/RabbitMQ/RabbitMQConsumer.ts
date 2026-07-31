/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel, ConsumeMessage } from 'amqplib';
import logger from '../utilities/logger';
import { RabbitMQConnectionManager } from './RabbitMQConnectionManager';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';

// How long to wait before rebuilding a consumer whose channel closed.
const REATTACH_DELAY_MS = 5000;

export class RabbitMQConsumer {
  constructor(
    private connectionManager: RabbitMQConnectionManager,
    private queueManager: RabbitMQQueueManager
  ) {}

  /**
   * Rebuilds a consumer after its channel closes.
   *
   * A consumer on a dead channel stops receiving silently — the queue simply
   * grows with nobody watching. Reconnecting the underlying connection is not
   * enough, because the consumer was registered against the old channel.
   */
  private reattachOnClose(channel: Channel, queue: string, restart: () => Promise<void>): void {
    channel.once('close', () => {
      logger.warn(`🔴 Consumer channel closed for queue: ${queue} — reattaching in ${REATTACH_DELAY_MS / 1000}s`);
      setTimeout(() => {
        restart().catch((error) => {
          logger.error(`❌ Failed to reattach consumer for queue ${queue}:`, error as any);
        });
      }, REATTACH_DELAY_MS);
    });

    // Without a listener amqplib emits an unhandled 'error' event, which takes
    // the whole process down on a channel-level failure.
    channel.on('error', (error) => {
      logger.error(`❌ Consumer channel error for queue ${queue}:`, error as any);
    });
  }

  async consume(
    queue: string,
    callback: (message: any) => Promise<boolean>,
    options?: {
      prefetch?: number;
      noAck?: boolean;
    }
  ): Promise<void> {
    try {
      await this.queueManager.ensureQueue(queue);

      // Own channel: prefetch is per-channel, so sharing one lets consumers
      // silently overwrite each other's limit.
      const channel = await this.connectionManager.createChannel();
      await channel.prefetch(options?.prefetch ?? 1);

      this.reattachOnClose(channel, queue, () => this.consume(queue, callback, options));

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
            logger.error(`❌ Error processing message from queue ${queue}:`, error as any);
            channel.nack(msg, false, true);
          }
        },
        {
          noAck: options?.noAck ?? false,
        }
      );

    } catch (error) {
      logger.error(`❌ Failed to start consumer for queue ${queue}:`, error as any);
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
      if (batchTimer) {
        clearTimeout(batchTimer);
        batchTimer = null;
      }
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
        logger.error(`❌ Error processing batch from queue ${queue}:`, error as any);
        currentBatch.forEach((item) => channel.nack(item.msg, false, true));
      }
    };

    try {
      await this.queueManager.ensureQueue(queue);

      // Own channel, and the prefetch must be at least the batch size: with a
      // smaller one the batch can never fill, so every flush waits out the full
      // batchTimeout and throughput collapses to batchSize/batchTimeout.
      const channel = await this.connectionManager.createChannel();
      await channel.prefetch(batchSize);

      this.reattachOnClose(channel, queue, () =>
        this.consumeBatch(queue, batchCallback, options)
      );

      logger.info(`🔵 Started batch consumer for queue: ${queue} (batch size: ${batchSize})`);

      await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const messageData = JSON.parse(msg.content.toString());
            messageBatch.push({ msg, data: messageData });

            // Throttle, not debounce: arm the flush timer when the FIRST message
            // of a batch arrives and never reset it on later messages, so a steady
            // stream that never fills the batch still flushes within batchTimeout.
            if (messageBatch.length === 1 && !batchTimer) {
              batchTimer = setTimeout(() => {
                void processBatch(channel);
              }, batchTimeout);
            }

            if (messageBatch.length >= batchSize) {
              await processBatch(channel);
            }

          } catch (error) {
            logger.error(`❌ Error adding message to batch from queue ${queue}:`, error as any);
            channel.nack(msg, false, true);
          }
        },
        {
          noAck: false,
        }
      );

    } catch (error) {
      logger.error(`❌ Failed to start batch consumer for queue ${queue}:`, error as any);
      throw error;
    }
  }
}
