import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';

vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RabbitMQConsumer } from '@server/source/RabbitMQ/RabbitMQConsumer';
import type { RabbitMQConnectionManager } from '@server/source/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@server/source/RabbitMQ/RabbitMQQueueManager';

type Handler = (msg: unknown) => Promise<void>;

function setup() {
  const channel = new FakeAmqpChannel();
  let handler: Handler = async () => {};
  channel.consume.mockImplementation((_q: string, h: Handler) => { handler = h; return Promise.resolve({ consumerTag: 't' }); });
  const connectionManager = { connect: vi.fn().mockResolvedValue(channel) } as unknown as RabbitMQConnectionManager;
  const queueManager = { ensureQueue: vi.fn().mockResolvedValue(undefined) } as unknown as RabbitMQQueueManager;
  const consumer = new RabbitMQConsumer(connectionManager, queueManager);
  const msg = (data: unknown) => ({ content: Buffer.from(JSON.stringify(data)) });
  return { consumer, channel, queueManager, msg, getHandler: () => handler };
}

beforeEach(() => vi.clearAllMocks());

describe('RabbitMQConsumer.consume', () => {
  it('sets prefetch and registers a consumer with manual ack', async () => {
    const { consumer, channel } = setup();
    await consumer.consume('q', async () => true, { prefetch: 5 });
    expect(channel.prefetch).toHaveBeenCalledWith(5);
    expect(channel.consume).toHaveBeenCalledWith('q', expect.any(Function), { noAck: false });
  });

  it('acks the message when the callback returns true', async () => {
    const { consumer, channel, msg, getHandler } = setup();
    await consumer.consume('q', async () => true);
    const m = msg({ x: 1 });
    await getHandler()(m);
    expect(channel.ack).toHaveBeenCalledWith(m);
  });

  it('nacks (requeue) when the callback returns false', async () => {
    const { consumer, channel, msg, getHandler } = setup();
    await consumer.consume('q', async () => false);
    const m = msg({ x: 1 });
    await getHandler()(m);
    expect(channel.nack).toHaveBeenCalledWith(m, false, true);
  });

  it('nacks (requeue) when the callback throws', async () => {
    const { consumer, channel, msg, getHandler } = setup();
    await consumer.consume('q', async () => { throw new Error('boom'); });
    const m = msg({ x: 1 });
    await getHandler()(m);
    expect(channel.nack).toHaveBeenCalledWith(m, false, true);
  });

  it('ignores a null message', async () => {
    const { consumer, channel, getHandler } = setup();
    await consumer.consume('q', async () => true);
    await getHandler()(null);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('rethrows when the consumer fails to start', async () => {
    const { consumer, channel } = setup();
    channel.prefetch.mockRejectedValue(new Error('down'));
    await expect(consumer.consume('q', async () => true)).rejects.toThrow('down');
  });
});

describe('RabbitMQConsumer.consumeBatch', () => {
  afterEach(() => vi.useRealTimers());

  it('flushes and acks a full batch immediately', async () => {
    const { consumer, channel, msg, getHandler } = setup();
    const cb = vi.fn().mockResolvedValue(true);
    await consumer.consumeBatch('q', cb, { batchSize: 2 });

    const m1 = msg({ a: 1 });
    const m2 = msg({ a: 2 });
    await getHandler()(m1);
    await getHandler()(m2); // reaches batchSize → flush

    expect(cb).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }]);
    expect(channel.ack).toHaveBeenCalledTimes(2);
  });

  it('flushes a partial batch after the timeout and nacks on failure', async () => {
    vi.useFakeTimers();
    const { consumer, channel, msg, getHandler } = setup();
    const cb = vi.fn().mockResolvedValue(false);
    await consumer.consumeBatch('q', cb, { batchSize: 10, batchTimeout: 1000 });

    await getHandler()(msg({ a: 1 }));
    await vi.advanceTimersByTimeAsync(1000);

    expect(cb).toHaveBeenCalledWith([{ a: 1 }]);
    expect(channel.nack).toHaveBeenCalledTimes(1);
  });
});
