import { describe, it, expect, vi } from 'vitest';
import { RedisCacheService } from '@server/source/Redis/Redis.cache';
import type { RedisConnectionManager } from '@nexoralShared/Redis/RedisConnectionManager';
import type { RedisCacheStore } from '@nexoralShared/Redis/RedisCacheStore';
import type { RedisPubSub } from '@nexoralShared/Redis/RedisPubSub';
import type { RedisAdminInspector } from '@server/source/Redis/RedisAdminInspector';

/** RedisCacheService is a pure facade over 4 collaborators. */
function setup() {
  const connectionManager = { connect: vi.fn().mockResolvedValue('client'), getClient: vi.fn().mockResolvedValue('client'), close: vi.fn().mockResolvedValue(undefined) };
  const cacheStore = {
    set: vi.fn().mockResolvedValue(undefined), get: vi.fn().mockResolvedValue('cached'),
    delete: vi.fn().mockResolvedValue(true), exists: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn().mockResolvedValue(5), getTTL: vi.fn().mockResolvedValue(30),
    expire: vi.fn().mockResolvedValue(1), flushAll: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ hit_rate: '90%' }),
  };
  const pubSub = { subscribe: vi.fn().mockResolvedValue(undefined), publish: vi.fn().mockResolvedValue(2), close: vi.fn().mockResolvedValue(undefined) };
  const adminInspector = { getAllRecords: vi.fn().mockResolvedValue([{ key: 'k' }]), deleteCacheEntry: vi.fn().mockResolvedValue(true) };

  const service = new RedisCacheService(
    connectionManager as unknown as RedisConnectionManager,
    cacheStore as unknown as RedisCacheStore,
    pubSub as unknown as RedisPubSub,
    adminInspector as unknown as RedisAdminInspector,
  );
  return { service, connectionManager, cacheStore, pubSub, adminInspector };
}

describe('RedisCacheService (facade)', () => {
  it('connect()/getClient() delegate to the connection manager', async () => {
    const { service } = setup();
    expect(await service.connect()).toBe('client');
    expect(await service.getClient()).toBe('client');
  });

  it('cache methods delegate to the cache store with the same args', async () => {
    const { service, cacheStore } = setup();
    await service.set('k', 'v', 10);
    expect(cacheStore.set).toHaveBeenCalledWith('k', 'v', 10);
    expect(await service.get('k')).toBe('cached');
    expect(await service.delete('k')).toBe(true);
    expect(await service.exists('k')).toBe(true);
    expect(await service.invalidate('k*')).toBe(5);
    expect(await service.getTTL('k')).toBe(30);
    expect(await service.expire('k', 30)).toBe(1);
    await service.flushAll();
    expect(cacheStore.flushAll).toHaveBeenCalledTimes(1);
    expect(await service.getStats()).toEqual({ hit_rate: '90%' });
  });

  it('pub/sub methods delegate to pubSub', async () => {
    const { service, pubSub } = setup();
    const cb = vi.fn();
    await service.subscribe('ch', cb);
    expect(pubSub.subscribe).toHaveBeenCalledWith('ch', cb);
    expect(await service.publish('ch', 'm')).toBe(2);
  });

  it('admin methods delegate to the admin inspector', async () => {
    const { service, adminInspector } = setup();
    expect(await service.getAllRecords('*', 100, 0)).toEqual([{ key: 'k' }]);
    expect(adminInspector.getAllRecords).toHaveBeenCalledWith('*', 100, 0);
    expect(await service.deleteCacheEntry('k')).toBe(true);
  });

  it('close() closes pubSub before the connection manager (ordering matters)', async () => {
    const { service, connectionManager, pubSub } = setup();
    const order: string[] = [];
    pubSub.close.mockImplementation(async () => { order.push('pubSub'); });
    connectionManager.close.mockImplementation(async () => { order.push('connectionManager'); });
    await service.close();
    expect(order).toEqual(['pubSub', 'connectionManager']);
  });
});
