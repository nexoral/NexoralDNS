import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';

vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RabbitMQPublisher } from '@server/source/RabbitMQ/RabbitMQPublisher';
import type { RabbitMQConnectionManager } from '@server/source/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@server/source/RabbitMQ/RabbitMQQueueManager';

function setup() {
  const channel = new FakeAmqpChannel();
  const connectionManager = { connect: vi.fn().mockResolvedValue(channel) } as unknown as RabbitMQConnectionManager;
  const queueManager = { ensureQueue: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQQueueManager;
  return { publisher: new RabbitMQPublisher(connectionManager, queueManager), channel, queueManager };
}

beforeEach(() => vi.clearAllMocks());

describe('RabbitMQPublisher.publish', () => {
  it('ensures the queue and sends a JSON buffer with default options', async () => {
    const { publisher, channel, queueManager } = setup();
    const ok = await publisher.publish('q1', { a: 1 });

    expect(queueManager.ensureQueue).toHaveBeenCalledWith('q1');
    expect(channel.sendToQueue).toHaveBeenCalledWith(
      'q1',
      Buffer.from(JSON.stringify({ a: 1 })),
      { persistent: true, priority: 5, expiration: undefined },
    );
    expect(ok).toBe(true);
  });

  it('honours custom persistence/priority/expiration options', async () => {
    const { publisher, channel } = setup();
    await publisher.publish('q1', { a: 1 }, { persistent: false, priority: 9, expiration: '1000' });
    expect(channel.sendToQueue).toHaveBeenCalledWith(expect.anything(), expect.anything(), { persistent: false, priority: 9, expiration: '1000' });
  });

  it('returns false when the broker buffer is full (sendToQueue false)', async () => {
    const { publisher, channel } = setup();
    channel.sendToQueue.mockReturnValue(false);
    expect(await publisher.publish('q1', {})).toBe(false);
  });

  it('returns false on error', async () => {
    const { publisher, channel } = setup();
    channel.sendToQueue.mockImplementation(() => { throw new Error('x'); });
    expect(await publisher.publish('q1', {})).toBe(false);
  });
});

describe('RabbitMQPublisher.publishBatch', () => {
  it('publishes every message and returns the success count', async () => {
    const { publisher, channel } = setup();
    const count = await publisher.publishBatch('q1', [{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(count).toBe(3);
    expect(channel.sendToQueue).toHaveBeenCalledTimes(3);
  });

  it('counts only the messages the broker accepted', async () => {
    const { publisher, channel } = setup();
    channel.sendToQueue.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
    expect(await publisher.publishBatch('q1', [{}, {}, {}])).toBe(2);
  });

  it('returns the count so far on error', async () => {
    const { publisher, channel } = setup();
    channel.sendToQueue.mockReturnValueOnce(true).mockImplementationOnce(() => { throw new Error('x'); });
    expect(await publisher.publishBatch('q1', [{}, {}, {}])).toBe(1);
  });
});
