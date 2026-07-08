import { describe, it, expect, vi, beforeEach } from 'vitest';

const { containerMock } = vi.hoisted(() => ({ containerMock: { get: vi.fn() } }));
vi.mock('@server/source/container/appContainer', () => ({ default: containerMock }));

import { CachedSessionStore } from '@server/source/Middlewares/SessionStore';

function setup(overrides: { collection?: unknown } = {}) {
  const redis = { get: vi.fn(), set: vi.fn() };
  const collection = 'collection' in overrides ? overrides.collection : { findOne: vi.fn() };
  const mongoMgr = { getCollection: vi.fn().mockReturnValue(collection) };
  containerMock.get.mockImplementation((key: string) => {
    if (key === 'RedisCacheService') return redis;
    if (key === 'MongoCollectionManager') return mongoMgr;
    throw new Error(`unexpected key ${key}`);
  });
  return { redis, collection: collection as { findOne: ReturnType<typeof vi.fn> }, mongoMgr };
}

beforeEach(() => vi.clearAllMocks());

describe('CachedSessionStore.getSession', () => {
  it('returns the Redis-cached session without hitting Mongo', async () => {
    const { redis, mongoMgr } = setup();
    redis.get.mockResolvedValue({ isLoggedIn: true, cached: true });

    const result = await new CachedSessionStore().getSession('tok');

    expect(redis.get).toHaveBeenCalledWith('session:tok');
    expect(result).toEqual({ isLoggedIn: true, cached: true });
    expect(mongoMgr.getCollection).not.toHaveBeenCalled();
  });

  it('falls back to Mongo on a cache miss and back-fills Redis (30-min TTL)', async () => {
    const { redis, collection } = setup();
    redis.get.mockResolvedValue(null);
    const session = { accessToken: 'tok', isLoggedIn: true };
    collection.findOne.mockResolvedValue(session);

    const result = await new CachedSessionStore().getSession('tok');

    expect(collection.findOne).toHaveBeenCalledWith({ accessToken: 'tok' });
    expect(redis.set).toHaveBeenCalledWith('session:tok', session, 1800);
    expect(result).toBe(session);
  });

  it('returns null when the session collection is unavailable', async () => {
    const { redis } = setup({ collection: null });
    redis.get.mockResolvedValue(null);

    expect(await new CachedSessionStore().getSession('tok')).toBeNull();
  });

  it('returns null and does not cache when no session is found in Mongo', async () => {
    const { redis, collection } = setup();
    redis.get.mockResolvedValue(null);
    collection.findOne.mockResolvedValue(null);

    const result = await new CachedSessionStore().getSession('tok');

    expect(result).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
});
