import { describe, it, expect, vi } from 'vitest';
import { RabbitMQPublisher } from '@nexoralShared/RabbitMQ/RabbitMQPublisher';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';
import type { RabbitMQConnectionManager } from '@nexoralShared/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@nexoralShared/RabbitMQ/RabbitMQQueueManager';

vi.mock('@nexoralShared/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function setup() {
  const channel = new FakeAmqpChannel();
  const conn = { connect: vi.fn().mockResolvedValue(channel) };
  const queueManager = { ensureQueue: vi.fn().mockResolvedValue(undefined) };
  const publisher = new RabbitMQPublisher(
    conn as unknown as RabbitMQConnectionManager,
    queueManager as unknown as RabbitMQQueueManager
  );
  return { channel, conn, queueManager, publisher };
}

describe('RabbitMQPublisher.publish', () => {
  it('serializes the message and sends it with default persistent=true, priority=5', async () => {
    const { channel, publisher, queueManager } = setup();
    expect(await publisher.publish('q1', { a: 1 })).toBe(true);
    expect(queueManager.ensureQueue).toHaveBeenCalledWith('q1');
    const [queue, buf, opts] = channel.sendToQueue.mock.calls[0];
    expect(queue).toBe('q1');
    expect(JSON.parse((buf as Buffer).toString())).toEqual({ a: 1 });
    expect(opts).toEqual({ persistent: true, priority: 5, expiration: undefined });
  });

  it('honors explicit persistent/priority/expiration options', async () => {
    const { channel, publisher } = setup();
    await publisher.publish('q1', { a: 1 }, { persistent: false, priority: 9, expiration: '1000' });
    expect(channel.sendToQueue.mock.calls[0][2]).toEqual({ persistent: false, priority: 9, expiration: '1000' });
  });

  it('returns false when channel.sendToQueue() reports the queue is full', async () => {
    const { channel, publisher } = setup();
    channel.sendToQueue.mockReturnValue(false);
    expect(await publisher.publish('q1', {})).toBe(false);
  });

  it('returns false when connect() throws', async () => {
    const { publisher, conn } = setup();
    conn.connect.mockRejectedValueOnce(new Error('down'));
    expect(await publisher.publish('q1', {})).toBe(false);
  });
});

describe('RabbitMQPublisher.publishBatch', () => {
  it('sends every message and returns the success count', async () => {
    const { channel, publisher } = setup();
    expect(await publisher.publishBatch('q1', [{ a: 1 }, { a: 2 }, { a: 3 }])).toBe(3);
    expect(channel.sendToQueue).toHaveBeenCalledTimes(3);
  });

  it('counts only the sends that returned true', async () => {
    const { channel, publisher } = setup();
    channel.sendToQueue.mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true);
    expect(await publisher.publishBatch('q1', [{}, {}, {}])).toBe(2);
  });

  it('returns 0 (not throwing) when connect() fails before any message is sent', async () => {
    const { publisher, conn } = setup();
    conn.connect.mockRejectedValueOnce(new Error('down'));
    expect(await publisher.publishBatch('q1', [{}, {}])).toBe(0);
  });

  it('returns the partial success count when sendToQueue throws mid-batch', async () => {
    const { channel, publisher } = setup();
    channel.sendToQueue.mockReturnValueOnce(true).mockImplementationOnce(() => {
      throw new Error('channel closed');
    });
    expect(await publisher.publishBatch('q1', [{}, {}, {}])).toBe(1);
  });
});
