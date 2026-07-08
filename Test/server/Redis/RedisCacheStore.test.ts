import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRedisClient, FakeRedisClient } from '../_testUtils/fakeRedis';

vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { RedisCacheStore } from '@server/source/Redis/RedisCacheStore';
import type { RedisConnectionManager } from '@server/source/Redis/RedisConnectionManager';

function setup() {
  const client = createFakeRedisClient();
  const connectionManager = { getClient: vi.fn().mockResolvedValue(client) } as unknown as RedisConnectionManager;
  const store = new RedisCacheStore(connectionManager);
  return { store, client, connectionManager };
}

beforeEach(() => vi.clearAllMocks());

describe('RedisCacheStore.set', () => {
  it('serialises objects and uses setEx when a TTL is given', async () => {
    const { store, client } = setup();
    await store.set('k', { a: 1 }, 30);
    expect(client.setEx).toHaveBeenCalledWith('k', 30, JSON.stringify({ a: 1 }));
  });

  it('stores raw strings without double-encoding', async () => {
    const { store, client } = setup();
    await store.set('k', 'plain', 10);
    expect(client.setEx).toHaveBeenCalledWith('k', 10, 'plain');
  });

  it('uses SET (no expiry) when ttl is 0', async () => {
    const { store, client } = setup();
    await store.set('k', 'v', 0);
    expect(client.set).toHaveBeenCalledWith('k', 'v');
    expect(client.setEx).not.toHaveBeenCalled();
  });

  it('swallows client errors', async () => {
    const { store, client } = setup();
    (client.setEx as any).mockRejectedValue(new Error('down'));
    await expect(store.set('k', 'v')).resolves.toBeUndefined();
  });
});

describe('RedisCacheStore.get', () => {
  it('parses JSON values', async () => {
    const { store, client } = setup();
    (client.get as any).mockResolvedValue(JSON.stringify({ a: 1 }));
    expect(await store.get('k')).toEqual({ a: 1 });
  });

  it('returns the raw string when the value is not JSON', async () => {
    const { store, client } = setup();
    (client.get as any).mockResolvedValue('not-json');
    expect(await store.get('k')).toBe('not-json');
  });

  it('returns null for a missing key', async () => {
    const { store, client } = setup();
    (client.get as any).mockResolvedValue(null);
    expect(await store.get('k')).toBeNull();
  });

  it('returns null on client error', async () => {
    const { store, client } = setup();
    (client.get as any).mockRejectedValue(new Error('down'));
    expect(await store.get('k')).toBeNull();
  });
});

describe('RedisCacheStore delete / exists / TTL / expire', () => {
  it('delete returns true when a key was removed', async () => {
    const { store, client } = setup();
    (client.del as any).mockResolvedValue(1);
    expect(await store.delete('k')).toBe(true);
  });

  it('delete returns false when nothing was removed / on error', async () => {
    const { store, client } = setup();
    (client.del as any).mockResolvedValue(0);
    expect(await store.delete('k')).toBe(false);
    (client.del as any).mockRejectedValue(new Error('x'));
    expect(await store.delete('k')).toBe(false);
  });

  it('exists reflects the client reply and defaults false on error', async () => {
    const { store, client } = setup();
    (client.exists as any).mockResolvedValue(1);
    expect(await store.exists('k')).toBe(true);
    (client.exists as any).mockRejectedValue(new Error('x'));
    expect(await store.exists('k')).toBe(false);
  });

  it('getTTL returns the client ttl and -1 on error', async () => {
    const { store, client } = setup();
    (client.ttl as any).mockResolvedValue(42);
    expect(await store.getTTL('k')).toBe(42);
    (client.ttl as any).mockRejectedValue(new Error('x'));
    expect(await store.getTTL('k')).toBe(-1);
  });

  it('expire returns the client result and 0 on error', async () => {
    const { store, client } = setup();
    (client.expire as any).mockResolvedValue(1);
    expect(await store.expire('k', 10)).toBe(1);
    (client.expire as any).mockRejectedValue(new Error('x'));
    expect(await store.expire('k', 10)).toBe(0);
  });
});

describe('RedisCacheStore.invalidate', () => {
  it('SCANs across cursor pages and deletes all matching keys', async () => {
    const { store, client } = setup();
    (client.scan as any)
      .mockResolvedValueOnce({ cursor: '5', keys: ['a', 'b'] })
      .mockResolvedValueOnce({ cursor: '0', keys: ['c'] });

    const count = await store.invalidate('pat*');

    expect(count).toBe(3);
    expect(client.del).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('returns 0 when nothing matches', async () => {
    const { store, client } = setup();
    (client.scan as any).mockResolvedValue({ cursor: '0', keys: [] });
    expect(await store.invalidate('none*')).toBe(0);
    expect(client.del).not.toHaveBeenCalled();
  });

  it('returns 0 on error', async () => {
    const { store, client } = setup();
    (client.scan as any).mockRejectedValue(new Error('x'));
    expect(await store.invalidate('p*')).toBe(0);
  });
});

describe('RedisCacheStore flushAll / getStats', () => {
  it('flushAll clears the client', async () => {
    const { store, client } = setup();
    await store.flushAll();
    expect(client.flushAll).toHaveBeenCalledTimes(1);
  });

  it('getStats parses INFO output and computes hit rate', async () => {
    const { store, client } = setup();
    (client.info as any).mockResolvedValue(
      ['connected_clients:3', 'used_memory_human:1M', 'used_memory_peak_human:2M', 'total_commands_processed:100', 'keyspace_hits:75', 'keyspace_misses:25'].join('\r\n'),
    );
    const stats = await store.getStats();
    expect(stats.connected_clients).toBe('3');
    expect(stats.hit_rate).toBe('75.00%');
  });

  it('getStats reports 0% hit rate when there is no traffic', async () => {
    const { store, client } = setup();
    (client.info as any).mockResolvedValue('keyspace_hits:0\r\nkeyspace_misses:0');
    expect((await store.getStats()).hit_rate).toBe('0%');
  });

  it('getStats returns null on error', async () => {
    const { store, client } = setup();
    (client.info as any).mockRejectedValue(new Error('x'));
    expect(await store.getStats()).toBeNull();
  });
});
