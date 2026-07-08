import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeRedisClient } from '@testUtils/fakeRedis';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('redis', () => ({ createClient: createClientMock }));
vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

async function importFresh() {
  vi.resetModules();
  const { RedisConnectionManager } = await import('@web/Redis/RedisConnectionManager');
  return RedisConnectionManager;
}

describe('RedisConnectionManager', () => {
  let client: ReturnType<typeof createFakeRedisClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createFakeRedisClient();
    createClientMock.mockReturnValue(client);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.REDIS_URI;
  });

  it('connects and returns the client', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    expect(await manager.connect()).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('reuses the client when it is already open', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    await manager.connect();
    expect(await manager.connect()).toBe(client);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('creates a fresh client if the previous one is no longer open', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    await manager.connect();
    client.isOpen = false;

    const secondClient = createFakeRedisClient();
    createClientMock.mockReturnValue(secondClient);

    expect(await manager.connect()).toBe(secondClient);
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });

  it('getRedisConfig() defaults to redis://localhost:6379 when REDIS_URI is unset', async () => {
    delete process.env.REDIS_URI;
    const RedisConnectionManager = await importFresh();
    expect(new RedisConnectionManager().getRedisConfig().options.url).toBe('redis://localhost:6379');
  });

  it('getRedisConfig() honors REDIS_URI', async () => {
    process.env.REDIS_URI = 'redis://custom:6380';
    const RedisConnectionManager = await importFresh();
    expect(new RedisConnectionManager().getRedisConfig().options.url).toBe('redis://custom:6380');
  });

  describe('reconnectStrategy', () => {
    it('returns an increasing delay capped at 500ms', async () => {
      const RedisConnectionManager = await importFresh();
      const strategy = new RedisConnectionManager().getRedisConfig().options.socket.reconnectStrategy;
      expect(strategy(1)).toBe(50);
      expect(strategy(5)).toBe(250);
      expect(strategy(10)).toBe(500); // 10*50=500 — at cap and within MAX_RECONNECT_ATTEMPTS
    });

    it('returns an Error once retries exceed MAX_RECONNECT_ATTEMPTS (10)', async () => {
      const RedisConnectionManager = await importFresh();
      const strategy = new RedisConnectionManager().getRedisConfig().options.socket.reconnectStrategy;
      expect(strategy(10)).toBe(500);
      expect(strategy(11)).toBeInstanceOf(Error);
    });
  });

  it('getClient() connects automatically when not yet open', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    expect(await manager.getClient()).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('getClient() reuses an already-open client without reconnecting', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    await manager.connect();
    await manager.getClient();
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('close() quits the client and clears the reference', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    await manager.connect();
    await manager.close();
    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it('close() is a no-op quit when never connected', async () => {
    const RedisConnectionManager = await importFresh();
    await new RedisConnectionManager().close();
    expect(client.quit).not.toHaveBeenCalled();
  });

  it('event handlers (connect/ready/error/reconnecting/end) do not throw when emitted', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();
    await manager.connect();
    expect(() => {
      client.emit('connect');
      client.emit('ready');
      client.emit('error', new Error('boom'));
      client.emit('reconnecting');
      client.emit('end');
    }).not.toThrow();
  });

  it('serializes concurrent connect() calls into a single createClient()', async () => {
    const RedisConnectionManager = await importFresh();
    const manager = new RedisConnectionManager();

    let resolveConnect!: () => void;
    client.connect.mockImplementation(
      () => new Promise<typeof client>((resolve) => { resolveConnect = () => resolve(client); })
    );

    const first = manager.connect();
    await Promise.resolve();
    const second = manager.connect();

    resolveConnect();
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe(client);
    expect(b).toBe(client);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});
