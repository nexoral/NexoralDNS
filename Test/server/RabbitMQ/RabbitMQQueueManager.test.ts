import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';

vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RabbitMQQueueManager } from '@server/source/RabbitMQ/RabbitMQQueueManager';
import type { RabbitMQConnectionManager } from '@server/source/RabbitMQ/RabbitMQConnectionManager';

function setup() {
  const channel = new FakeAmqpChannel();
  const connectionManager = { connect: vi.fn().mockResolvedValue(channel) } as unknown as RabbitMQConnectionManager;
  return { manager: new RabbitMQQueueManager(connectionManager), channel };
}

beforeEach(() => vi.clearAllMocks());

describe('RabbitMQQueueManager.ensureQueue', () => {
  it('asserts a durable priority queue', async () => {
    const { manager, channel } = setup();
    await manager.ensureQueue('q1');
    expect(channel.assertQueue).toHaveBeenCalledWith('q1', { durable: true, arguments: { 'x-max-priority': 10 } });
  });

  it('asserts each queue only once', async () => {
    const { manager, channel } = setup();
    await manager.ensureQueue('q1');
    await manager.ensureQueue('q1');
    expect(channel.assertQueue).toHaveBeenCalledTimes(1);
  });
});

describe('RabbitMQQueueManager.getQueueMessageCount', () => {
  it('returns the message count from checkQueue', async () => {
    const { manager, channel } = setup();
    channel.checkQueue.mockResolvedValue({ queue: 'q1', messageCount: 7, consumerCount: 0 });
    expect(await manager.getQueueMessageCount('q1')).toBe(7);
  });

  it('returns -1 on error', async () => {
    const { manager, channel } = setup();
    channel.checkQueue.mockRejectedValue(new Error('x'));
    expect(await manager.getQueueMessageCount('q1')).toBe(-1);
  });
});

describe('RabbitMQQueueManager.purgeQueue / deleteQueue', () => {
  it('purge returns true on success and false on error', async () => {
    const { manager, channel } = setup();
    expect(await manager.purgeQueue('q1')).toBe(true);
    channel.purgeQueue.mockRejectedValue(new Error('x'));
    expect(await manager.purgeQueue('q1')).toBe(false);
  });

  it('delete returns true on success and false on error', async () => {
    const { manager, channel } = setup();
    expect(await manager.deleteQueue('q1')).toBe(true);
    channel.deleteQueue.mockRejectedValue(new Error('x'));
    expect(await manager.deleteQueue('q1')).toBe(false);
  });
});
