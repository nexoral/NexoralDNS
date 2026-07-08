import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeAmqp } from '../_testUtils/fakeAmqp';

const { amqpConnectMock } = vi.hoisted(() => ({ amqpConnectMock: vi.fn() }));
vi.mock('amqplib', () => ({ default: { connect: amqpConnectMock } }));
vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RabbitMQConnectionManager } from '@server/source/RabbitMQ/RabbitMQConnectionManager';

let amqp: ReturnType<typeof createFakeAmqp>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  amqp = createFakeAmqp();
  amqpConnectMock.mockResolvedValue(amqp.connection);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete process.env.RABBITMQ_URI;
});

describe('RabbitMQConnectionManager.connect', () => {
  it('connects, opens a channel, and returns it', async () => {
    const m = new RabbitMQConnectionManager();
    const channel = await m.connect();
    expect(amqpConnectMock).toHaveBeenCalledTimes(1);
    expect(amqp.connection.createChannel).toHaveBeenCalledTimes(1);
    expect(channel).toBe(amqp.channel);
  });

  it('reuses the existing channel/connection', async () => {
    const m = new RabbitMQConnectionManager();
    await m.connect();
    await m.connect();
    expect(amqpConnectMock).toHaveBeenCalledTimes(1);
  });

  it('honours RABBITMQ_URI', async () => {
    process.env.RABBITMQ_URI = 'amqp://custom:5673';
    await new RabbitMQConnectionManager().connect();
    expect(amqpConnectMock).toHaveBeenCalledWith('amqp://custom:5673');
  });

  it('rethrows the original error after scheduling a reconnect', async () => {
    amqpConnectMock.mockRejectedValueOnce(new Error('refused')).mockResolvedValue(amqp.connection);
    const m = new RabbitMQConnectionManager();

    const settled = m.connect().catch((e) => e);
    await vi.runAllTimersAsync();

    expect(await settled).toBeInstanceOf(Error);
  });
});

describe('RabbitMQConnectionManager.getChannel / close', () => {
  it('getChannel returns null before connect and the channel after', async () => {
    const m = new RabbitMQConnectionManager();
    expect(m.getChannel()).toBeNull();
    await m.connect();
    expect(m.getChannel()).toBe(amqp.channel);
  });

  it('close() closes channel and connection then clears them', async () => {
    const m = new RabbitMQConnectionManager();
    await m.connect();
    await m.close();
    expect(amqp.channel.close).toHaveBeenCalledTimes(1);
    expect(amqp.connection.close).toHaveBeenCalledTimes(1);
    expect(m.getChannel()).toBeNull();
  });

  it('close() swallows errors', async () => {
    const m = new RabbitMQConnectionManager();
    await m.connect();
    amqp.channel.close.mockRejectedValue(new Error('x'));
    await expect(m.close()).resolves.toBeUndefined();
  });

  it("the connection 'close' event clears the channel", async () => {
    const m = new RabbitMQConnectionManager();
    await m.connect();
    amqp.connection.emit('close');
    await Promise.resolve();
    expect(m.getChannel()).toBeNull();
  });
});
