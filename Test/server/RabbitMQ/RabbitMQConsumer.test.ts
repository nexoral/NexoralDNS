import { describe, it, expect, vi, afterEach } from 'vitest';
import { RabbitMQConsumer } from '@nexoralShared/RabbitMQ/RabbitMQConsumer';
import { FakeAmqpChannel } from '../_testUtils/fakeAmqp';
import type { RabbitMQConnectionManager } from '@nexoralShared/RabbitMQ/RabbitMQConnectionManager';
import type { RabbitMQQueueManager } from '@nexoralShared/RabbitMQ/RabbitMQQueueManager';
import type { ConsumeMessage } from 'amqplib';

vi.mock('@nexoralShared/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function fakeMessage(payload: unknown): ConsumeMessage {
  return {
    content: Buffer.from(JSON.stringify(payload)),
    fields: {} as ConsumeMessage['fields'],
    properties: {} as ConsumeMessage['properties'],
  };
}

function badMessage(raw: string): ConsumeMessage {
  return {
    content: Buffer.from(raw),
    fields: {} as ConsumeMessage['fields'],
    properties: {} as ConsumeMessage['properties'],
  };
}

function setup() {
  const channel = new FakeAmqpChannel();
  const conn = { connect: vi.fn().mockResolvedValue(channel) };
  const queueManager = { ensureQueue: vi.fn().mockResolvedValue(undefined) };
  const consumer = new RabbitMQConsumer(
    conn as unknown as RabbitMQConnectionManager,
    queueManager as unknown as RabbitMQQueueManager
  );
  return { channel, conn, queueManager, consumer };
}

function getConsumeHandler(channel: FakeAmqpChannel): (msg: ConsumeMessage | null) => Promise<void> {
  return channel.consume.mock.calls[0][1];
}

afterEach(() => {
  vi.useRealTimers();
});

describe('RabbitMQConsumer.consume', () => {
  it('ensures the queue and sets the requested prefetch (default 1)', async () => {
    const { channel, queueManager, consumer } = setup();
    await consumer.consume('q1', async () => true);
    expect(queueManager.ensureQueue).toHaveBeenCalledWith('q1');
    expect(channel.prefetch).toHaveBeenCalledWith(1);
  });

  it('honors an explicit prefetch option', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => true, { prefetch: 25 });
    expect(channel.prefetch).toHaveBeenCalledWith(25);
  });

  it('acks the message when the callback resolves true', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => true);
    const msg = fakeMessage({ hello: 'world' });
    await getConsumeHandler(channel)(msg);
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('passes the parsed JSON payload to the callback', async () => {
    const { channel, consumer } = setup();
    const callback = vi.fn().mockResolvedValue(true);
    await consumer.consume('q1', callback);
    await getConsumeHandler(channel)(fakeMessage({ queryName: 'a.com' }));
    expect(callback).toHaveBeenCalledWith({ queryName: 'a.com' });
  });

  it('nacks with requeue=true when the callback resolves false', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => false);
    const msg = fakeMessage({});
    await getConsumeHandler(channel)(msg);
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('nacks with requeue=true when the payload is not valid JSON', async () => {
    const { channel, consumer } = setup();
    const callback = vi.fn().mockResolvedValue(true);
    await consumer.consume('q1', callback);
    const msg = badMessage('not-json{{');
    await getConsumeHandler(channel)(msg);
    expect(callback).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });

  it('nacks with requeue=true when the callback itself throws', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => {
      throw new Error('processing failed');
    });
    const msg = fakeMessage({});
    await getConsumeHandler(channel)(msg);
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });

  it('ignores a null message (consumer cancellation notification)', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => true);
    await expect(getConsumeHandler(channel)(null)).resolves.toBeUndefined();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('defaults noAck to false', async () => {
    const { channel, consumer } = setup();
    await consumer.consume('q1', async () => true);
    expect(channel.consume.mock.calls[0][2]).toEqual({ noAck: false });
  });

  it('rethrows and logs when the initial setup (ensureQueue) fails', async () => {
    const { queueManager, consumer } = setup();
    queueManager.ensureQueue.mockRejectedValueOnce(new Error('assert failed'));
    await expect(consumer.consume('q1', async () => true)).rejects.toThrow('assert failed');
  });
});

describe('RabbitMQConsumer.consumeBatch', () => {
  it('sets prefetch to the batch size (default 100)', async () => {
    const { channel, consumer } = setup();
    await consumer.consumeBatch('q1', async () => true);
    expect(channel.prefetch).toHaveBeenCalledWith(100);
  });

  it('flushes and acks the whole batch once batchSize is reached', async () => {
    const { channel, consumer } = setup();
    const batchCallback = vi.fn().mockResolvedValue(true);
    await consumer.consumeBatch('q1', batchCallback, { batchSize: 2 });
    const handler = getConsumeHandler(channel);
    const m1 = fakeMessage({ n: 1 });
    const m2 = fakeMessage({ n: 2 });
    await handler(m1);
    await handler(m2);
    expect(batchCallback).toHaveBeenCalledWith([{ n: 1 }, { n: 2 }]);
    expect(channel.ack).toHaveBeenCalledWith(m1);
    expect(channel.ack).toHaveBeenCalledWith(m2);
  });

  it('nacks the whole batch with requeue=true when batchCallback resolves false', async () => {
    const { channel, consumer } = setup();
    await consumer.consumeBatch('q1', async () => false, { batchSize: 2 });
    const handler = getConsumeHandler(channel);
    const m1 = fakeMessage({});
    const m2 = fakeMessage({});
    await handler(m1);
    await handler(m2);
    expect(channel.nack).toHaveBeenCalledWith(m1, false, true);
    expect(channel.nack).toHaveBeenCalledWith(m2, false, true);
  });

  it('nacks the whole batch when batchCallback throws', async () => {
    const { channel, consumer } = setup();
    await consumer.consumeBatch('q1', async () => { throw new Error('db down'); }, { batchSize: 1 });
    const m1 = fakeMessage({});
    await getConsumeHandler(channel)(m1);
    expect(channel.nack).toHaveBeenCalledWith(m1, false, true);
  });

  it('flushes a partial batch after batchTimeout elapses even if batchSize is never reached', async () => {
    vi.useFakeTimers();
    const { channel, consumer } = setup();
    const batchCallback = vi.fn().mockResolvedValue(true);
    await consumer.consumeBatch('q1', batchCallback, { batchSize: 100, batchTimeout: 1000 });
    await getConsumeHandler(channel)(fakeMessage({ n: 1 }));
    expect(batchCallback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(batchCallback).toHaveBeenCalledWith([{ n: 1 }]);
  });

  it('arms the flush timer on the first message and does not reset it on later messages (throttle, not debounce)', async () => {
    vi.useFakeTimers();
    const { channel, consumer } = setup();
    const batchCallback = vi.fn().mockResolvedValue(true);
    await consumer.consumeBatch('q1', batchCallback, { batchSize: 100, batchTimeout: 1000 });
    const handler = getConsumeHandler(channel);
    await handler(fakeMessage({ n: 1 }));
    await vi.advanceTimersByTimeAsync(700);
    await handler(fakeMessage({ n: 2 })); // must NOT push the timer out further
    await vi.advanceTimersByTimeAsync(300); // total 1000ms since the first message
    expect(batchCallback).toHaveBeenCalledWith([{ n: 1 }, { n: 2 }]);
  });

  it('starts a fresh timer for the next batch after a flush', async () => {
    vi.useFakeTimers();
    const { channel, consumer } = setup();
    const batchCallback = vi.fn().mockResolvedValue(true);
    await consumer.consumeBatch('q1', batchCallback, { batchSize: 100, batchTimeout: 1000 });
    const handler = getConsumeHandler(channel);
    await handler(fakeMessage({ n: 1 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(batchCallback).toHaveBeenCalledTimes(1);
    await handler(fakeMessage({ n: 2 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(batchCallback).toHaveBeenCalledTimes(2);
    expect(batchCallback).toHaveBeenLastCalledWith([{ n: 2 }]);
  });

  it('nacks a message with requeue=true if adding it to the batch throws (malformed JSON)', async () => {
    const { channel, consumer } = setup();
    await consumer.consumeBatch('q1', async () => true, { batchSize: 5 });
    const msg = badMessage('{not-json');
    await getConsumeHandler(channel)(msg);
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });

  it('ignores a null message', async () => {
    const { channel, consumer } = setup();
    await consumer.consumeBatch('q1', async () => true);
    await expect(getConsumeHandler(channel)(null)).resolves.toBeUndefined();
  });

  it('rethrows and logs when the initial batch-consumer setup (ensureQueue) fails', async () => {
    const { queueManager, consumer } = setup();
    queueManager.ensureQueue.mockRejectedValueOnce(new Error('assert failed'));
    await expect(consumer.consumeBatch('q1', async () => true)).rejects.toThrow('assert failed');
  });
});
