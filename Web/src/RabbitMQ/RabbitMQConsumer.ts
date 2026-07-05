/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel, ConsumeMessage } from 'amqplib';
import { Console } from 'outers';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';

export class RabbitMQConsumer {
  constructor(
    private channel: Channel,
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
      await this.queueManager.ensureQueue(queue);

      await this.channel.prefetch(options?.prefetch ?? 1);

      Console.green(`🔵 Started consuming from queue: ${queue}`);

      await this.channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const messageData = JSON.parse(msg.content.toString());

            const success = await callback(messageData);

            if (success) {
              this.channel.ack(msg);
              Console.bright(`✅ Message processed and acknowledged from queue: ${queue}`);
            } else {
              this.channel.nack(msg, false, true);
              Console.yellow(`⚠️  Message processing failed, requeued: ${queue}`);
            }

          } catch (error) {
            Console.red(`❌ Error processing message from queue ${queue}:`, error);
            this.channel.nack(msg, false, true);
          }
        },
        {
          noAck: options?.noAck ?? false,
        }
      );

    } catch (error) {
      Console.red(`❌ Failed to start consumer for queue ${queue}:`, error);
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

    const processBatch = async () => {
      if (messageBatch.length === 0) return;

      const currentBatch = [...messageBatch];
      messageBatch = [];

      try {
        Console.bright(`📦 Processing batch of ${currentBatch.length} messages from queue: ${queue}`);

        const messages = currentBatch.map((item) => item.data);

        const success = await batchCallback(messages);

        if (success) {
          currentBatch.forEach((item) => this.channel.ack(item.msg));
          Console.green(`✅ Batch of ${currentBatch.length} messages processed successfully`);
        } else {
          currentBatch.forEach((item) => this.channel.nack(item.msg, false, true));
          Console.yellow(`⚠️  Batch processing failed, messages requeued`);
        }

      } catch (error) {
        Console.red(`❌ Error processing batch from queue ${queue}:`, error);
        currentBatch.forEach((item) => this.channel.nack(item.msg, false, true));
      }
    };

    try {
      await this.queueManager.ensureQueue(queue);

      await this.channel.prefetch(batchSize);

      Console.green(`🔵 Started batch consumer for queue: ${queue} (batch size: ${batchSize})`);

      await this.channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const messageData = JSON.parse(msg.content.toString());
            messageBatch.push({ msg, data: messageData });

            if (batchTimer) clearTimeout(batchTimer);

            if (messageBatch.length >= batchSize) {
              await processBatch();
            } else {
              batchTimer = setTimeout(async () => {
                await processBatch();
              }, batchTimeout);
            }

          } catch (error) {
            Console.red(`❌ Error adding message to batch from queue ${queue}:`, error);
            this.channel.nack(msg, false, true);
          }
        },
        {
          noAck: false,
        }
      );

    } catch (error) {
      Console.red(`❌ Failed to start batch consumer for queue ${queue}:`, error);
      throw error;
    }
  }
}
