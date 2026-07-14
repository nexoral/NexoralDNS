import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRedisClient } from '../_testUtils/fakeRedis';

vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

import { RedisAdminInspector } from '@server/source/Redis/RedisAdminInspector';
import type { RedisConnectionManager } from '@nexoralShared/Redis/RedisConnectionManager';

function setup() {
  const client = createFakeRedisClient();
  // Extend the fake with the type-specific readers the inspector uses.
  (client as any).type = vi.fn();
  (client as any).lRange = vi.fn().mockResolvedValue([]);
  (client as any).hGetAll = vi.fn().mockResolvedValue({});
  const connectionManager = { getClient: vi.fn().mockResolvedValue(client) } as unknown as RedisConnectionManager;
  const inspector = new RedisAdminInspector(connectionManager);
  return { inspector, client };
}

beforeEach(() => vi.clearAllMocks());

describe('RedisAdminInspector.getAllRecords', () => {
  it('SCANs all pages and resolves a string record with its ttl', async () => {
    const { inspector, client } = setup();
    (client.scan as any).mockResolvedValueOnce({ cursor: '0', keys: ['s1'] });
    (client as any).type.mockResolvedValue('string');
    (client.get as any).mockResolvedValue('value');
    (client.ttl as any).mockResolvedValue(120);

    const records = await inspector.getAllRecords();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ key: 's1', type: 'string', value: 'value', ttl: 120 });
    expect(records[0].expiresAt).not.toBe('never');
  });

  it('reports "no expiry"/"never" for keys without a TTL', async () => {
    const { inspector, client } = setup();
    (client.scan as any).mockResolvedValue({ cursor: '0', keys: ['s1'] });
    (client as any).type.mockResolvedValue('string');
    (client.get as any).mockResolvedValue('v');
    (client.ttl as any).mockResolvedValue(-1);

    const [record] = await inspector.getAllRecords();

    expect(record.ttl).toBe('no expiry');
    expect(record.expiresAt).toBe('never');
  });

  it('summarises non-string types (list/set/hash) as type(size)', async () => {
    const { inspector, client } = setup();
    (client.scan as any).mockResolvedValue({ cursor: '0', keys: ['l', 'se', 'h'] });
    (client as any).type.mockImplementation(async (k: string) => (k === 'l' ? 'list' : k === 'se' ? 'set' : 'hash'));
    (client.ttl as any).mockResolvedValue(-1);
    (client as any).lRange.mockResolvedValue(['a', 'b']);
    (client.sMembers as any).mockResolvedValue(['x']);
    (client as any).hGetAll.mockResolvedValue({ f1: '1', f2: '2' });

    const records = await inspector.getAllRecords();
    const byKey = Object.fromEntries(records.map((r) => [r.key, r.value]));

    expect(byKey.l).toBe('list(2)');
    expect(byKey.se).toBe('set(1)');
    expect(byKey.h).toBe('hash(2)');
  });

  it('applies skip/limit pagination over the scanned keys', async () => {
    const { inspector, client } = setup();
    (client.scan as any).mockResolvedValue({ cursor: '0', keys: ['k0', 'k1', 'k2', 'k3'] });
    (client as any).type.mockResolvedValue('string');
    (client.get as any).mockResolvedValue('v');
    (client.ttl as any).mockResolvedValue(-1);

    const records = await inspector.getAllRecords('*', 2, 1);

    expect(records.map((r) => r.key)).toEqual(['k1', 'k2']);
  });

  it('returns [] on error', async () => {
    const { inspector, client } = setup();
    (client.scan as any).mockRejectedValue(new Error('down'));
    expect(await inspector.getAllRecords()).toEqual([]);
  });
});

describe('RedisAdminInspector.deleteCacheEntry', () => {
  it('returns true when a key was deleted', async () => {
    const { inspector, client } = setup();
    (client.del as any).mockResolvedValue(1);
    expect(await inspector.deleteCacheEntry('k')).toBe(true);
  });

  it('returns false when nothing was deleted', async () => {
    const { inspector, client } = setup();
    (client.del as any).mockResolvedValue(0);
    expect(await inspector.deleteCacheEntry('k')).toBe(false);
  });

  it('returns false on error', async () => {
    const { inspector, client } = setup();
    (client.del as any).mockRejectedValue(new Error('down'));
    expect(await inspector.deleteCacheEntry('k')).toBe(false);
  });
});
