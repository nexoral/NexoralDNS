/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel } from 'amqplib';
import { Console } from 'outers';

export class RabbitMQQueueManager {
  private readonly assertedQueues: Set<string> = new Set();

  constructor(private channel: Channel) {}

  async ensureQueue(queue: string): Promise<void> {
    if (this.assertedQueues.has(queue)) return;

    await this.channel.assertQueue(queue, {
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
      const queueInfo = await this.channel.checkQueue(queue);
      return queueInfo.messageCount;
    } catch (error) {
      Console.red(`❌ Failed to get message count for queue ${queue}:`, error);
      return -1;
    }
  }

  async purgeQueue(queue: string): Promise<boolean> {
    try {
      await this.channel.purgeQueue(queue);
      Console.green(`✅ Purged all messages from queue: ${queue}`);
      return true;
    } catch (error) {
      Console.red(`❌ Failed to purge queue ${queue}:`, error);
      return false;
    }
  }

  async deleteQueue(queue: string): Promise<boolean> {
    try {
      await this.channel.deleteQueue(queue);
      Console.green(`✅ Deleted queue: ${queue}`);
      return true;
    } catch (error) {
      Console.red(`❌ Failed to delete queue ${queue}:`, error);
      return false;
    }
  }
}
