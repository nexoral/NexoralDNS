import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRedisClient } from '../_testUtils/fakeRedis';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock('redis', () => ({ createClient: createClientMock }));
vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RedisPubSub } from '@server/source/Redis/RedisPubSub';
import type { RedisConnectionManager } from '@server/source/Redis/RedisConnectionManager';

function setup() {
  const subscriber = createFakeRedisClient();
  createClientMock.mockReturnValue(subscriber);
  const mainClient = createFakeRedisClient();
  const connectionManager = { getClient: vi.fn().mockResolvedValue(mainClient) } as unknown as RedisConnectionManager;
  const getRedisConfig = vi.fn(() => ({ mode: 'standalone', options: { url: 'redis://x' } }));
  const pubSub = new RedisPubSub(connectionManager, getRedisConfig);
  return { pubSub, subscriber, mainClient, connectionManager, getRedisConfig };
}

beforeEach(() => vi.clearAllMocks());

describe('RedisPubSub.subscribe', () => {
  it('creates a dedicated subscriber client, connects and subscribes', async () => {
    const { pubSub, subscriber, getRedisConfig } = setup();
    const cb = vi.fn();

    await pubSub.subscribe('ch', cb);

    expect(getRedisConfig).toHaveBeenCalled();
    expect(subscriber.connect).toHaveBeenCalledTimes(1);
    expect(subscriber.subscribe).toHaveBeenCalledWith('ch', expect.any(Function));
  });

  it('forwards received messages to the callback', async () => {
    const { pubSub, subscriber } = setup();
    const cb = vi.fn();
    (subscriber.subscribe as any).mockImplementation(async (_ch: string, handler: (m: string) => void) => handler('hello'));

    await pubSub.subscribe('ch', cb);

    expect(cb).toHaveBeenCalledWith('hello');
  });

  it('reuses an open subscriber client across subscribes', async () => {
    const { pubSub, subscriber } = setup();
    subscriber.isOpen = true;
    await pubSub.subscribe('a', vi.fn());
    await pubSub.subscribe('b', vi.fn());
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows and resets the subscriber on failure', async () => {
    const { pubSub, subscriber } = setup();
    (subscriber.connect as any).mockRejectedValue(new Error('down'));
    await expect(pubSub.subscribe('ch', vi.fn())).rejects.toThrow('down');
  });
});

describe('RedisPubSub.publish', () => {
  it('publishes via the main connection and returns the receiver count', async () => {
    const { pubSub, mainClient } = setup();
    (mainClient.publish as any).mockResolvedValue(3);
    expect(await pubSub.publish('ch', 'msg')).toBe(3);
    expect(mainClient.publish).toHaveBeenCalledWith('ch', 'msg');
  });

  it('returns 0 on publish error', async () => {
    const { pubSub, mainClient } = setup();
    (mainClient.publish as any).mockRejectedValue(new Error('x'));
    expect(await pubSub.publish('ch', 'msg')).toBe(0);
  });
});

describe('RedisPubSub.close', () => {
  it('quits the subscriber client when one exists', async () => {
    const { pubSub, subscriber } = setup();
    await pubSub.subscribe('ch', vi.fn());
    await pubSub.close();
    expect(subscriber.quit).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when never subscribed', async () => {
    const { pubSub, subscriber } = setup();
    await pubSub.close();
    expect(subscriber.quit).not.toHaveBeenCalled();
  });
});
