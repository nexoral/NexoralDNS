/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel } from 'amqplib';
import { Console } from 'outers';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';

export class RabbitMQPublisher {
  constructor(
    private channel: Channel,
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
      await this.queueManager.ensureQueue(queue);

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const sent = this.channel.sendToQueue(queue, messageBuffer, {
        persistent: options?.persistent ?? true,
        priority: options?.priority ?? 5,
        expiration: options?.expiration,
      });

      if (sent) {
        Console.bright(`📤 Published message to queue: ${queue}`);
      } else {
        Console.yellow(`⚠️  Queue ${queue} is full, message buffered`);
      }

      return sent;

    } catch (error) {
      Console.red(`❌ Failed to publish to queue ${queue}:`, error);
      return false;
    }
  }

  async publishBatch(queue: string, messages: any[]): Promise<number> {
    let successCount = 0;

    try {
      await this.queueManager.ensureQueue(queue);

      for (const message of messages) {
        const messageBuffer = Buffer.from(JSON.stringify(message));
        const sent = this.channel.sendToQueue(queue, messageBuffer, { persistent: true });
        if (sent) successCount++;
      }

      Console.bright(`📤 Published ${successCount}/${messages.length} messages to queue: ${queue}`);

    } catch (error) {
      Console.red(`❌ Failed to publish batch to queue ${queue}:`, error);
    }

    return successCount;
  }
}
