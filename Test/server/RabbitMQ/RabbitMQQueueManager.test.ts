import { describe, it, expect, vi } from 'vitest';
import { RabbitMQQueueManager } from '@nexoralShared/RabbitMQ/RabbitMQQueueManager';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';
import type { RabbitMQConnectionManager } from '@nexoralShared/RabbitMQ/RabbitMQConnectionManager';

vi.mock('@nexoralShared/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function createFakeConnManager(channel: FakeAmqpChannel) {
  return { connect: vi.fn().mockResolvedValue(channel) };
}

describe('RabbitMQQueueManager', () => {
  it('ensureQueue() asserts the queue with durable + priority args', async () => {
    const channel = new FakeAmqpChannel();
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    await mgr.ensureQueue('q1');
    expect(channel.assertQueue).toHaveBeenCalledWith('q1', {
      durable: true,
      arguments: { 'x-max-priority': 10 },
    });
  });

  it('ensureQueue() only asserts a given queue once (cached)', async () => {
    const channel = new FakeAmqpChannel();
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    await mgr.ensureQueue('q1');
    await mgr.ensureQueue('q1');
    await mgr.ensureQueue('q2');
    expect(channel.assertQueue).toHaveBeenCalledTimes(2);
  });

  it('getQueueMessageCount() ensures the queue then returns messageCount', async () => {
    const channel = new FakeAmqpChannel();
    channel.checkQueue.mockResolvedValue({ queue: 'q1', messageCount: 7, consumerCount: 1 });
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    expect(await mgr.getQueueMessageCount('q1')).toBe(7);
  });

  it('getQueueMessageCount() returns -1 on error', async () => {
    const channel = new FakeAmqpChannel();
    channel.checkQueue.mockRejectedValue(new Error('no such queue'));
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    expect(await mgr.getQueueMessageCount('missing')).toBe(-1);
  });

  it('purgeQueue() returns true on success', async () => {
    const channel = new FakeAmqpChannel();
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    expect(await mgr.purgeQueue('q1')).toBe(true);
    expect(channel.purgeQueue).toHaveBeenCalledWith('q1');
  });

  it('purgeQueue() returns false on error', async () => {
    const channel = new FakeAmqpChannel();
    channel.purgeQueue.mockRejectedValue(new Error('boom'));
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    expect(await mgr.purgeQueue('q1')).toBe(false);
  });

  it('deleteQueue() returns true on success and false on error', async () => {
    const channel = new FakeAmqpChannel();
    const mgr = new RabbitMQQueueManager(createFakeConnManager(channel) as unknown as RabbitMQConnectionManager);
    expect(await mgr.deleteQueue('q1')).toBe(true);
    channel.deleteQueue.mockRejectedValueOnce(new Error('boom'));
    expect(await mgr.deleteQueue('q1')).toBe(false);
  });
});
