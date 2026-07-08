import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeAmqp, FakeAmqpConnection } from '@testUtils/fakeAmqp';

const { amqpConnect } = vi.hoisted(() => ({ amqpConnect: vi.fn() }));

vi.mock('amqplib', () => ({ default: { connect: amqpConnect } }));
vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

async function importFresh() {
  vi.resetModules();
  const { RabbitMQConnectionManager } = await import('@web/RabbitMQ/RabbitMQConnectionManager');
  return RabbitMQConnectionManager;
}

describe('RabbitMQConnectionManager', () => {
  let fake: ReturnType<typeof createFakeAmqp>;

  beforeEach(() => {
    vi.clearAllMocks();
    fake = createFakeAmqp();
    amqpConnect.mockResolvedValue(fake.connection);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects and returns a channel on first call', async () => {
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    expect(await manager.connect()).toBe(fake.channel);
    expect(amqpConnect).toHaveBeenCalledTimes(1);
    expect(fake.connection.createChannel).toHaveBeenCalledTimes(1);
  });

  it('reuses the existing channel + connection on subsequent calls', async () => {
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();
    expect(await manager.connect()).toBe(fake.channel);
    expect(amqpConnect).toHaveBeenCalledTimes(1);
  });

  it('a second concurrent connect() waits for the in-flight one via waitForConnection() (single amqp.connect)', async () => {
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();

    let resolveConn!: () => void;
    amqpConnect.mockImplementation(() => new Promise((res) => { resolveConn = () => res(fake.connection); }));

    const first = manager.connect();
    await Promise.resolve(); // first sets isConnecting=true and awaits amqp.connect
    const second = manager.connect(); // isConnecting → enters the waitForConnection() poll loop

    resolveConn(); // first's amqp.connect resolves; isConnecting flips false in finally
    await vi.advanceTimersByTimeAsync(100); // let waitForConnection's 100ms poll observe isConnecting=false

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(fake.channel);
    expect(b).toBe(fake.channel);
    expect(amqpConnect).toHaveBeenCalledTimes(1); // second reused the first connection, no re-dial
  });

  it('getChannel() returns null before connecting and the channel after', async () => {
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    expect(manager.getChannel()).toBeNull();
    await manager.connect();
    expect(manager.getChannel()).toBe(fake.channel);
  });

  it('rejects and schedules a background reconnect when the initial connect fails', async () => {
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    amqpConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const manager = new RabbitMQConnectionManager();

    await expect(manager.connect()).rejects.toThrow('ECONNREFUSED');

    amqpConnect.mockResolvedValue(fake.connection);
    await vi.advanceTimersByTimeAsync(5000);
    expect(manager.getChannel()).toBe(fake.channel);
  });

  it('close() closes channel then connection and resets state', async () => {
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();
    await manager.close();
    expect(fake.channel.close).toHaveBeenCalledTimes(1);
    expect(fake.connection.close).toHaveBeenCalledTimes(1);
    expect(manager.getChannel()).toBeNull();
  });

  it('close() swallows errors from channel.close() and does not throw, skipping connection.close()', async () => {
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();
    fake.channel.close.mockRejectedValueOnce(new Error('already closed'));
    await expect(manager.close()).resolves.toBeUndefined();
    expect(fake.connection.close).not.toHaveBeenCalled();
  });

  it('reconnects automatically when the connection emits "close"', async () => {
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();

    const secondFake = createFakeAmqp();
    amqpConnect.mockResolvedValue(secondFake.connection);

    fake.connection.emit('close');
    expect(manager.getChannel()).toBeNull(); // torn down immediately on close

    await vi.advanceTimersByTimeAsync(5000);
    expect(amqpConnect).toHaveBeenCalledTimes(2);
    expect(manager.getChannel()).toBe(secondFake.channel);
  });

  it('on "error" the background loop fires but connection/channel are NOT cleared, so the stale channel is reused', async () => {
    // Unlike 'close', the 'error' handler only calls scheduleReconnect() — it
    // does not null out this.connection/this.channel. So connect() inside the
    // reconnect loop takes the "already connected" fast path and never calls
    // amqp.connect() again. This documents that real (subtle) behavior.
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();

    const secondFake = createFakeAmqp();
    amqpConnect.mockResolvedValue(secondFake.connection);

    fake.connection.emit('error', new Error('reset by peer'));
    await vi.advanceTimersByTimeAsync(5000);

    expect(amqpConnect).toHaveBeenCalledTimes(1);
    expect(manager.getChannel()).toBe(fake.channel);
  });

  it('gives up after MAX_RECONNECT_ATTEMPTS (10) consecutive failures', async () => {
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();

    amqpConnect.mockRejectedValue(new Error('down'));
    fake.connection.emit('close');

    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(amqpConnect).toHaveBeenCalledTimes(11); // 1 initial + 10 retries

    amqpConnect.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(amqpConnect).not.toHaveBeenCalled();
  });

  it('a successful reconnect resets the attempt counter for future failures', async () => {
    vi.useFakeTimers();
    const RabbitMQConnectionManager = await importFresh();
    const manager = new RabbitMQConnectionManager();
    await manager.connect();

    amqpConnect
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce(fake.connection as unknown as FakeAmqpConnection);
    fake.connection.emit('close');

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(manager.getChannel()).toBe(fake.channel);
    expect(amqpConnect).toHaveBeenCalledTimes(4); // initial + 3 retries
  });
});
