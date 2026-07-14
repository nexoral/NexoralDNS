/* eslint-disable @typescript-eslint/no-explicit-any */
import { Channel } from 'amqplib';
import { RabbitMQConnectionManager } from './RabbitMQConnectionManager';
import { RabbitMQQueueManager } from './RabbitMQQueueManager';
import { RabbitMQPublisher } from './RabbitMQPublisher';
import { RabbitMQConsumer } from './RabbitMQConsumer';

export class RabbitMQService {
  constructor(
    private connectionManager: RabbitMQConnectionManager,
    private queueManager: RabbitMQQueueManager,
    private publisher: RabbitMQPublisher,
    private consumer: RabbitMQConsumer
  ) {}

  public async connect(): Promise<Channel> {
    return this.connectionManager.connect();
  }

  public async publish(
    queue: string,
    message: any,
    options?: { persistent?: boolean; priority?: number; expiration?: string }
  ): Promise<boolean> {
    return this.publisher.publish(queue, message, options);
  }

  public async publishBatch(queue: string, messages: any[]): Promise<number> {
    return this.publisher.publishBatch(queue, messages);
  }

  public async consume(
    queue: string,
    callback: (message: any) => Promise<boolean>,
    options?: { prefetch?: number; noAck?: boolean }
  ): Promise<void> {
    return this.consumer.consume(queue, callback, options);
  }

  public async consumeBatch(
    queue: string,
    batchCallback: (messages: any[]) => Promise<boolean>,
    options?: { batchSize?: number; batchTimeout?: number }
  ): Promise<void> {
    return this.consumer.consumeBatch(queue, batchCallback, options);
  }

  public async getQueueMessageCount(queue: string): Promise<number> {
    return this.queueManager.getQueueMessageCount(queue);
  }

  public async purgeQueue(queue: string): Promise<boolean> {
    return this.queueManager.purgeQueue(queue);
  }

  public async deleteQueue(queue: string): Promise<boolean> {
    return this.queueManager.deleteQueue(queue);
  }

  public async close(): Promise<void> {
    return this.connectionManager.close();
  }
}

// Export singleton instance
