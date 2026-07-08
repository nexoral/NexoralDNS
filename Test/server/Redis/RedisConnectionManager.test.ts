import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeRedisClient } from '../_testUtils/fakeRedis';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('redis', () => ({ createClient: createClientMock }));
vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

async function importFresh() {
  vi.resetModules();
  const { RedisConnectionManager } = await import('@server/source/Redis/RedisConnectionManager');
  return RedisConnectionManager;
}

describe('RedisConnectionManager', () => {
  let client: ReturnType<typeof createFakeRedisClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createFakeRedisClient();
    createClientMock.mockReturnValue(client);
  });
  afterEach(() => { delete process.env.REDIS_URI; });

  it('connects and returns the client', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    expect(await m.connect()).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('reuses an already-open client', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    await m.connect();
    expect(await m.connect()).toBe(client);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('creates a fresh client when the previous is no longer open', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    await m.connect();
    client.isOpen = false;
    const client2 = createFakeRedisClient();
    createClientMock.mockReturnValue(client2);
    expect(await m.connect()).toBe(client2);
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });

  it('getRedisConfig() defaults to redis://localhost:6379', async () => {
    delete process.env.REDIS_URI;
    const RCM = await importFresh();
    expect(new RCM().getRedisConfig().options.url).toBe('redis://localhost:6379');
  });

  it('getRedisConfig() honours REDIS_URI', async () => {
    process.env.REDIS_URI = 'redis://custom:6380';
    const RCM = await importFresh();
    expect(new RCM().getRedisConfig().options.url).toBe('redis://custom:6380');
  });

  describe('reconnectStrategy', () => {
    it('returns an increasing delay capped at 500ms', async () => {
      const RCM = await importFresh();
      const s = new RCM().getRedisConfig().options.socket.reconnectStrategy;
      expect(s(1)).toBe(50);
      expect(s(5)).toBe(250);
      expect(s(10)).toBe(500);
    });

    it('returns an Error once retries exceed the max (10)', async () => {
      const RCM = await importFresh();
      const s = new RCM().getRedisConfig().options.socket.reconnectStrategy;
      expect(s(11)).toBeInstanceOf(Error);
    });
  });

  it('getClient() connects automatically when not open', async () => {
    const RCM = await importFresh();
    expect(await new RCM().getClient()).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('close() quits the client and clears the reference', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    await m.connect();
    await m.close();
    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it('close() is a no-op when never connected', async () => {
    const RCM = await importFresh();
    await new RCM().close();
    expect(client.quit).not.toHaveBeenCalled();
  });

  it('event handlers do not throw when emitted', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    await m.connect();
    expect(() => {
      client.emit('connect'); client.emit('ready'); client.emit('error', new Error('x'));
      client.emit('reconnecting'); client.emit('end');
    }).not.toThrow();
  });

  it('serialises concurrent connect() into a single createClient()', async () => {
    const RCM = await importFresh();
    const m = new RCM();
    let resolve!: () => void;
    client.connect.mockImplementation(() => new Promise((r) => { resolve = () => r(client); }));
    const a = m.connect();
    await Promise.resolve();
    const b = m.connect();
    resolve();
    await Promise.all([a, b]);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});
