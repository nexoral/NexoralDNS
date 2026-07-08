import { describe, it, expect, vi } from 'vitest';
import { RabbitMQService } from '@web/RabbitMQ/Rabbitmq.config';
import type { RabbitMQConnectionManager } from '@web/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@web/RabbitMQ/RabbitMQQueueManager';
import type { RabbitMQPublisher } from '@web/RabbitMQ/RabbitMQPublisher';
import type { RabbitMQConsumer } from '@web/RabbitMQ/RabbitMQConsumer';

/** RabbitMQService is a pure facade: each method delegates to one collaborator. */
describe('RabbitMQService (facade)', () => {
  function setup() {
    const connectionManager = { connect: vi.fn().mockResolvedValue('channel'), close: vi.fn().mockResolvedValue(undefined) };
    const queueManager = {
      getQueueMessageCount: vi.fn().mockResolvedValue(3),
      purgeQueue: vi.fn().mockResolvedValue(true),
      deleteQueue: vi.fn().mockResolvedValue(true),
    };
    const publisher = { publish: vi.fn().mockResolvedValue(true), publishBatch: vi.fn().mockResolvedValue(2) };
    const consumer = { consume: vi.fn().mockResolvedValue(undefined), consumeBatch: vi.fn().mockResolvedValue(undefined) };

    const service = new RabbitMQService(
      connectionManager as unknown as RabbitMQConnectionManager,
      queueManager as unknown as RabbitMQQueueManager,
      publisher as unknown as RabbitMQPublisher,
      consumer as unknown as RabbitMQConsumer
    );
    return { service, connectionManager, queueManager, publisher, consumer };
  }

  it('connect() delegates to connectionManager.connect()', async () => {
    const { service, connectionManager } = setup();
    expect(await service.connect()).toBe('channel');
    expect(connectionManager.connect).toHaveBeenCalledTimes(1);
  });

  it('publish() delegates to publisher.publish() with the same args', async () => {
    const { service, publisher } = setup();
    const opts = { persistent: false };
    expect(await service.publish('q', { a: 1 }, opts)).toBe(true);
    expect(publisher.publish).toHaveBeenCalledWith('q', { a: 1 }, opts);
  });

  it('publishBatch() delegates to publisher.publishBatch()', async () => {
    const { service, publisher } = setup();
    expect(await service.publishBatch('q', [{ a: 1 }])).toBe(2);
    expect(publisher.publishBatch).toHaveBeenCalledWith('q', [{ a: 1 }]);
  });

  it('consume() delegates to consumer.consume()', async () => {
    const { service, consumer } = setup();
    const cb = async () => true;
    await service.consume('q', cb, { prefetch: 5 });
    expect(consumer.consume).toHaveBeenCalledWith('q', cb, { prefetch: 5 });
  });

  it('consumeBatch() delegates to consumer.consumeBatch()', async () => {
    const { service, consumer } = setup();
    const cb = async () => true;
    await service.consumeBatch('q', cb, { batchSize: 10 });
    expect(consumer.consumeBatch).toHaveBeenCalledWith('q', cb, { batchSize: 10 });
  });

  it('getQueueMessageCount() delegates to queueManager', async () => {
    const { service, queueManager } = setup();
    expect(await service.getQueueMessageCount('q')).toBe(3);
    expect(queueManager.getQueueMessageCount).toHaveBeenCalledWith('q');
  });

  it('purgeQueue() and deleteQueue() delegate to queueManager', async () => {
    const { service, queueManager } = setup();
    expect(await service.purgeQueue('q')).toBe(true);
    expect(await service.deleteQueue('q')).toBe(true);
    expect(queueManager.purgeQueue).toHaveBeenCalledWith('q');
    expect(queueManager.deleteQueue).toHaveBeenCalledWith('q');
  });

  it('close() delegates to connectionManager.close()', async () => {
    const { service, connectionManager } = setup();
    await service.close();
    expect(connectionManager.close).toHaveBeenCalledTimes(1);
  });
});
