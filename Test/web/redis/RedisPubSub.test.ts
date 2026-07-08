import { describe, it, expect, vi } from 'vitest';
import { RedisPubSub } from '@web/Redis/RedisPubSub';
import { createFakeRedisClient } from '@testUtils/fakeRedis';
import type { RedisConnectionManager } from '@web/Redis/RedisConnectionManager';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('redis', () => ({ createClient: createClientMock }));
vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function setup() {
  const publishClient = createFakeRedisClient();
  const connectionManager = { getClient: vi.fn().mockResolvedValue(publishClient) };
  const getRedisConfig = vi.fn(() => ({ mode: 'standalone', options: { url: 'redis://x' } }));
  const pubSub = new RedisPubSub(connectionManager as unknown as RedisConnectionManager, getRedisConfig);
  return { pubSub, publishClient, connectionManager, getRedisConfig };
}

describe('RedisPubSub.subscribe', () => {
  it('creates a subscriber client, connects it, and registers the channel callback', async () => {
    const subscriberClient = createFakeRedisClient();
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    await pubSub.subscribe('cache:invalidate', vi.fn());
    expect(subscriberClient.connect).toHaveBeenCalledTimes(1);
    expect(subscriberClient.subscribe).toHaveBeenCalledWith('cache:invalidate', expect.any(Function));
  });

  it('forwards incoming messages to the caller-supplied callback', async () => {
    const subscriberClient = createFakeRedisClient();
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    const callback = vi.fn();
    await pubSub.subscribe('ch', callback);
    subscriberClient.subscribe.mock.calls[0][1]('payload-1');
    expect(callback).toHaveBeenCalledWith('payload-1');
  });

  it('reuses the existing subscriber client on a second subscribe() while still open', async () => {
    const subscriberClient = createFakeRedisClient();
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    await pubSub.subscribe('ch1', vi.fn());
    await pubSub.subscribe('ch2', vi.fn());
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(subscriberClient.subscribe).toHaveBeenCalledTimes(2);
  });

  it('creates a fresh subscriber client if the previous one is no longer open', async () => {
    const firstClient = createFakeRedisClient();
    createClientMock.mockReturnValueOnce(firstClient);
    const { pubSub } = setup();
    await pubSub.subscribe('ch1', vi.fn());
    firstClient.isOpen = false;

    const secondClient = createFakeRedisClient();
    createClientMock.mockReturnValueOnce(secondClient);
    await pubSub.subscribe('ch2', vi.fn());
    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(firstClient.quit).toHaveBeenCalledTimes(1);
  });

  it('nulls out the subscriber client on an "error" event', async () => {
    const subscriberClient = createFakeRedisClient();
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    await pubSub.subscribe('ch1', vi.fn());

    subscriberClient.emit('error', new Error('conn reset'));

    const secondClient = createFakeRedisClient();
    createClientMock.mockReturnValueOnce(secondClient);
    await pubSub.subscribe('ch2', vi.fn());
    expect(createClientMock).toHaveBeenCalledTimes(2);
  });

  it('sets subscriberClient to null and does not throw when connect() fails', async () => {
    const subscriberClient = createFakeRedisClient();
    subscriberClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    await expect(pubSub.subscribe('ch1', vi.fn())).resolves.toBeUndefined();
  });
});

describe('RedisPubSub.publish', () => {
  it('publishes via the shared connectionManager client and returns the subscriber count', async () => {
    const { pubSub, publishClient } = setup();
    publishClient.publish.mockResolvedValue(3);
    expect(await pubSub.publish('ch', 'hello')).toBe(3);
    expect(publishClient.publish).toHaveBeenCalledWith('ch', 'hello');
  });

  it('returns 0 on a publish error', async () => {
    const { pubSub, publishClient } = setup();
    publishClient.publish.mockRejectedValue(new Error('down'));
    expect(await pubSub.publish('ch', 'hello')).toBe(0);
  });
});

describe('RedisPubSub.close', () => {
  it('quits the subscriber client and clears it', async () => {
    const subscriberClient = createFakeRedisClient();
    createClientMock.mockReturnValue(subscriberClient);
    const { pubSub } = setup();
    await pubSub.subscribe('ch', vi.fn());
    await pubSub.close();
    expect(subscriberClient.quit).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when never subscribed', async () => {
    const { pubSub } = setup();
    await expect(pubSub.close()).resolves.toBeUndefined();
  });
});
