import { describe, it, expect, vi } from 'vitest';
import { RedisCacheStore } from '@web/Redis/RedisCacheStore';
import { createFakeRedisClient } from '@testUtils/fakeRedis';
import type { RedisConnectionManager } from '@web/Redis/RedisConnectionManager';

vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function setup() {
  const client = createFakeRedisClient();
  const connectionManager = { getClient: vi.fn().mockResolvedValue(client) };
  const store = new RedisCacheStore(connectionManager as unknown as RedisConnectionManager);
  return { client, store };
}

describe('RedisCacheStore.set', () => {
  it('JSON-serializes non-string values and calls setEx with the given TTL', async () => {
    const { client, store } = setup();
    await store.set('k1', { a: 1 }, 30);
    expect(client.setEx).toHaveBeenCalledWith('k1', 30, JSON.stringify({ a: 1 }));
  });

  it('passes string values through unmodified', async () => {
    const { client, store } = setup();
    await store.set('k1', 'raw-string', 30);
    expect(client.setEx).toHaveBeenCalledWith('k1', 30, 'raw-string');
  });

  it('defaults TTL to 60 when omitted', async () => {
    const { client, store } = setup();
    await store.set('k1', 'v');
    expect(client.setEx).toHaveBeenCalledWith('k1', 60, 'v');
  });

  it('does NOT cache when ttl <= 0 (instant policy toggle semantics)', async () => {
    const { client, store } = setup();
    await store.set('k1', 'v', 0);
    await store.set('k2', 'v', -5);
    expect(client.setEx).not.toHaveBeenCalled();
  });

  it('swallows errors from the client without throwing', async () => {
    const { client, store } = setup();
    client.setEx.mockRejectedValueOnce(new Error('down'));
    await expect(store.set('k1', 'v')).resolves.toBeUndefined();
  });
});

describe('RedisCacheStore.get', () => {
  it('returns null on a cache miss', async () => {
    const { store } = setup();
    expect(await store.get('missing')).toBeNull();
  });

  it('JSON-parses a stored value', async () => {
    const { client, store } = setup();
    client.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    expect(await store.get('k1')).toEqual({ a: 1 });
  });

  it('returns the raw string when it is not valid JSON', async () => {
    const { client, store } = setup();
    client.get.mockResolvedValue('not-json{{');
    expect(await store.get('k1')).toBe('not-json{{');
  });

  it('returns null on a client error', async () => {
    const { client, store } = setup();
    client.get.mockRejectedValue(new Error('down'));
    expect(await store.get('k1')).toBeNull();
  });
});

describe('RedisCacheStore.delete / exists', () => {
  it('delete() returns true when the client deleted at least one key', async () => {
    const { client, store } = setup();
    client.del.mockResolvedValue(1);
    expect(await store.delete('k1')).toBe(true);
  });

  it('delete() returns false when nothing was deleted', async () => {
    const { store } = setup();
    expect(await store.delete('missing')).toBe(false);
  });

  it('delete() returns false on error', async () => {
    const { client, store } = setup();
    client.del.mockRejectedValue(new Error('down'));
    expect(await store.delete('k1')).toBe(false);
  });

  it('exists() maps client.exists() result to a boolean', async () => {
    const { client, store } = setup();
    client.exists.mockResolvedValue(1);
    expect(await store.exists('k1')).toBe(true);
    client.exists.mockResolvedValue(0);
    expect(await store.exists('k1')).toBe(false);
  });

  it('exists() returns false on error', async () => {
    const { client, store } = setup();
    client.exists.mockRejectedValue(new Error('down'));
    expect(await store.exists('k1')).toBe(false);
  });
});

describe('RedisCacheStore.invalidate', () => {
  it('paginates through SCAN cursors and deletes every matched key', async () => {
    const { client, store } = setup();
    client.scan
      .mockResolvedValueOnce({ cursor: '5', keys: ['a:1', 'a:2'] })
      .mockResolvedValueOnce({ cursor: '0', keys: ['a:3'] });

    expect(await store.invalidate('a:*')).toBe(3);
    expect(client.del).toHaveBeenCalledWith(['a:1', 'a:2', 'a:3']);
    expect(client.scan).toHaveBeenNthCalledWith(1, '0', { MATCH: 'a:*', COUNT: 100 });
    expect(client.scan).toHaveBeenNthCalledWith(2, '5', { MATCH: 'a:*', COUNT: 100 });
  });

  it('returns 0 and skips del() when no keys match', async () => {
    const { client, store } = setup();
    client.scan.mockResolvedValue({ cursor: '0', keys: [] });
    expect(await store.invalidate('nomatch:*')).toBe(0);
    expect(client.del).not.toHaveBeenCalled();
  });

  it('returns 0 on a scan error', async () => {
    const { client, store } = setup();
    client.scan.mockRejectedValue(new Error('down'));
    expect(await store.invalidate('a:*')).toBe(0);
  });
});

describe('RedisCacheStore.getTTL / expire / flushAll', () => {
  it('getTTL() returns the client ttl value', async () => {
    const { client, store } = setup();
    client.ttl.mockResolvedValue(42);
    expect(await store.getTTL('k1')).toBe(42);
  });

  it('getTTL() returns -1 on error', async () => {
    const { client, store } = setup();
    client.ttl.mockRejectedValue(new Error('down'));
    expect(await store.getTTL('k1')).toBe(-1);
  });

  it('expire() returns the client result', async () => {
    const { client, store } = setup();
    client.expire.mockResolvedValue(1);
    expect(await store.expire('k1', 30)).toBe(1);
  });

  it('expire() returns 0 on error', async () => {
    const { client, store } = setup();
    client.expire.mockRejectedValue(new Error('down'));
    expect(await store.expire('k1', 30)).toBe(0);
  });

  it('flushAll() calls client.flushAll() and does not throw on error', async () => {
    const { client, store } = setup();
    await store.flushAll();
    expect(client.flushAll).toHaveBeenCalledTimes(1);
    client.flushAll.mockRejectedValueOnce(new Error('down'));
    await expect(store.flushAll()).resolves.toBeUndefined();
  });
});

describe('RedisCacheStore.getStats', () => {
  it('parses the Redis INFO string into a stats object with a computed hit rate', async () => {
    const { client, store } = setup();
    client.info.mockResolvedValue(
      [
        'connected_clients:5',
        'used_memory_human:1.2M',
        'used_memory_peak_human:2.0M',
        'total_commands_processed:1000',
        'keyspace_hits:80',
        'keyspace_misses:20',
      ].join('\r\n')
    );

    expect(await store.getStats()).toEqual({
      connected_clients: '5',
      used_memory: '1.2M',
      used_memory_peak: '2.0M',
      total_commands_processed: '1000',
      keyspace_hits: '80',
      keyspace_misses: '20',
      hit_rate: '80.00%',
    });
  });

  it('reports 0% hit rate when there have been no hits or misses', async () => {
    const { client, store } = setup();
    client.info.mockResolvedValue('connected_clients:0');
    expect((await store.getStats()).hit_rate).toBe('0%');
  });

  it('returns null on an error', async () => {
    const { client, store } = setup();
    client.info.mockRejectedValue(new Error('down'));
    expect(await store.getStats()).toBeNull();
  });
});
