import { describe, it, expect, vi } from 'vitest';
import { RabbitMQService } from '@server/source/RabbitMQ/Rabbitmq.config';
import type { RabbitMQConnectionManager } from '@server/source/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@server/source/RabbitMQ/RabbitMQQueueManager';
import type { RabbitMQPublisher } from '@server/source/RabbitMQ/RabbitMQPublisher';
import type { RabbitMQConsumer } from '@server/source/RabbitMQ/RabbitMQConsumer';

/** RabbitMQService is a pure facade over its 4 collaborators. */
function setup() {
  const connectionManager = { connect: vi.fn().mockResolvedValue('channel'), close: vi.fn().mockResolvedValue(undefined) };
  const queueManager = { getQueueMessageCount: vi.fn().mockResolvedValue(4), purgeQueue: vi.fn().mockResolvedValue(true), deleteQueue: vi.fn().mockResolvedValue(true) };
  const publisher = { publish: vi.fn().mockResolvedValue(true), publishBatch: vi.fn().mockResolvedValue(3) };
  const consumer = { consume: vi.fn().mockResolvedValue(undefined), consumeBatch: vi.fn().mockResolvedValue(undefined) };
  const service = new RabbitMQService(
    connectionManager as unknown as RabbitMQConnectionManager,
    queueManager as unknown as RabbitMQQueueManager,
    publisher as unknown as RabbitMQPublisher,
    consumer as unknown as RabbitMQConsumer,
  );
  return { service, connectionManager, queueManager, publisher, consumer };
}

describe('RabbitMQService (facade)', () => {
  it('connect()/close() delegate to the connection manager', async () => {
    const { service, connectionManager } = setup();
    expect(await service.connect()).toBe('channel');
    await service.close();
    expect(connectionManager.close).toHaveBeenCalledTimes(1);
  });

  it('publish()/publishBatch() delegate to the publisher', async () => {
    const { service, publisher } = setup();
    await service.publish('q', { a: 1 }, { priority: 9 });
    expect(publisher.publish).toHaveBeenCalledWith('q', { a: 1 }, { priority: 9 });
    expect(await service.publishBatch('q', [{}, {}])).toBe(3);
  });

  it('consume()/consumeBatch() delegate to the consumer', async () => {
    const { service, consumer } = setup();
    const cb = vi.fn();
    await service.consume('q', cb, { prefetch: 2 });
    expect(consumer.consume).toHaveBeenCalledWith('q', cb, { prefetch: 2 });
    await service.consumeBatch('q', cb, { batchSize: 5 });
    expect(consumer.consumeBatch).toHaveBeenCalledWith('q', cb, { batchSize: 5 });
  });

  it('queue admin methods delegate to the queue manager', async () => {
    const { service, queueManager } = setup();
    expect(await service.getQueueMessageCount('q')).toBe(4);
    expect(await service.purgeQueue('q')).toBe(true);
    expect(await service.deleteQueue('q')).toBe(true);
    expect(queueManager.getQueueMessageCount).toHaveBeenCalledWith('q');
  });
});
