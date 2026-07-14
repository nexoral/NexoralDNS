import { describe, it, expect, vi } from 'vitest';
import { RedisCacheService } from '@web/Redis/Redis.cache';
import type { RedisConnectionManager } from '@nexoralShared/Redis/RedisConnectionManager';
import type { RedisCacheStore } from '@nexoralShared/Redis/RedisCacheStore';
import type { RedisPubSub } from '@nexoralShared/Redis/RedisPubSub';
import type { AclBlockingService } from '@web/Redis/AclBlockingService';

/** RedisCacheService is a pure facade over 4 collaborators. */
describe('RedisCacheService (facade)', () => {
  function setup() {
    const connectionManager = { connect: vi.fn().mockResolvedValue('client'), getClient: vi.fn().mockResolvedValue('client'), close: vi.fn().mockResolvedValue(undefined) };
    const cacheStore = {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue('cached'),
      delete: vi.fn().mockResolvedValue(true),
      exists: vi.fn().mockResolvedValue(true),
      invalidate: vi.fn().mockResolvedValue(5),
      getTTL: vi.fn().mockResolvedValue(30),
      expire: vi.fn().mockResolvedValue(1),
      flushAll: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({ hit_rate: '90%' }),
    };
    const pubSub = {
      subscribe: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(2),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const aclService = {
      getBlockedDomainsForIP: vi.fn().mockResolvedValue(['a.com']),
      getGloballyBlockedDomains: vi.fn().mockResolvedValue(['b.com']),
      getACLMetadata: vi.fn().mockResolvedValue({ totalPolicies: 1 }),
      isDomainBlocked: vi.fn().mockResolvedValue(true),
    };

    const service = new RedisCacheService(
      connectionManager as unknown as RedisConnectionManager,
      cacheStore as unknown as RedisCacheStore,
      pubSub as unknown as RedisPubSub,
      aclService as unknown as AclBlockingService
    );
    return { service, connectionManager, cacheStore, pubSub, aclService };
  }

  it('connect() / getClient() delegate to connectionManager', async () => {
    const { service } = setup();
    expect(await service.connect()).toBe('client');
    expect(await service.getClient()).toBe('client');
  });

  it('cache methods delegate to cacheStore with the same args', async () => {
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

  it('subscribe()/publish() delegate to pubSub', async () => {
    const { service, pubSub } = setup();
    const cb = vi.fn();
    await service.subscribe('ch', cb);
    expect(pubSub.subscribe).toHaveBeenCalledWith('ch', cb);
    expect(await service.publish('ch', 'msg')).toBe(2);
  });

  it('close() closes pubSub BEFORE connectionManager (ordering matters)', async () => {
    const { service, connectionManager, pubSub } = setup();
    const order: string[] = [];
    pubSub.close.mockImplementation(async () => { order.push('pubSub'); });
    connectionManager.close.mockImplementation(async () => { order.push('connectionManager'); });
    await service.close();
    expect(order).toEqual(['pubSub', 'connectionManager']);
  });

  it('ACL methods delegate to aclService', async () => {
    const { service, aclService } = setup();
    expect(await service.getBlockedDomainsForIP('1.1.1.1')).toEqual(['a.com']);
    expect(await service.getGloballyBlockedDomains()).toEqual(['b.com']);
    expect(await service.getACLMetadata()).toEqual({ totalPolicies: 1 });
    expect(await service.isDomainBlocked('1.1.1.1', 'a.com')).toBe(true);
    expect(aclService.isDomainBlocked).toHaveBeenCalledWith('1.1.1.1', 'a.com');
  });
});
