import { describe, it, expect, vi } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';

const { mockContainer } = vi.hoisted(() => ({ mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() } }));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('@web/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

async function importFresh(collMgr: { getCollection: ReturnType<typeof vi.fn> }) {
  vi.resetModules();
  Object.assign(mockContainer, createMockContainer({ MongoCollectionManager: collMgr }));
  const { DomainDBPoolService } = await import('@web/services/DB/DB_Pool.service');
  return new DomainDBPoolService();
}

function fakeCollectionManager(findOneImpl: (query: { name: string }) => unknown) {
  const findOne = vi.fn(findOneImpl);
  return { getCollection: vi.fn(() => ({ findOne })), findOne };
}

describe('DomainDBPoolService.getDnsRecordByDomainName', () => {
  it('returns null when the domain has no record at all', async () => {
    const service = await importFresh(fakeCollectionManager(async () => null));
    expect(await service.getDnsRecordByDomainName('missing.local')).toBeNull();
  });

  it('returns an A record renamed to the original query name', async () => {
    const service = await importFresh(
      fakeCollectionManager(async ({ name }) => (name === 'a.local' ? { name: 'a.local', type: 'A', value: '1.2.3.4', ttl: 60 } : null))
    );
    expect(await service.getDnsRecordByDomainName('a.local')).toEqual({ name: 'a.local', type: 'A', value: '1.2.3.4', ttl: 60 });
  });

  it('follows a single CNAME hop to its A record and renames back to the original query name', async () => {
    const records: Record<string, unknown> = {
      'www.local': { name: 'www.local', type: 'CNAME', value: 'target.local' },
      'target.local': { name: 'target.local', type: 'A', value: '5.6.7.8', ttl: 120 },
    };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    expect(await service.getDnsRecordByDomainName('www.local')).toEqual({ name: 'www.local', type: 'A', value: '5.6.7.8', ttl: 120 });
  });

  it('follows multiple chained CNAME hops', async () => {
    const records: Record<string, unknown> = {
      a: { name: 'a', type: 'CNAME', value: 'b' },
      b: { name: 'b', type: 'CNAME', value: 'c' },
      c: { name: 'c', type: 'A', value: '9.9.9.9', ttl: 10 },
    };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    expect(await service.getDnsRecordByDomainName('a')).toEqual({ name: 'a', type: 'A', value: '9.9.9.9', ttl: 10 });
  });

  it('returns a non-A/AAAA/CNAME record (e.g. TXT) renamed to the query name', async () => {
    const service = await importFresh(
      fakeCollectionManager(async ({ name }) => (name === 'txt.local' ? { name: 'txt.local', type: 'TXT', value: 'v=spf1', ttl: 300 } : null))
    );
    expect(await service.getDnsRecordByDomainName('txt.local')).toEqual({ name: 'txt.local', type: 'TXT', value: 'v=spf1', ttl: 300 });
  });

  it('throws on a circular CNAME reference (a -> b -> a)', async () => {
    const records: Record<string, unknown> = {
      a: { name: 'a', type: 'CNAME', value: 'b' },
      b: { name: 'b', type: 'CNAME', value: 'a' },
    };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    await expect(service.getDnsRecordByDomainName('a')).rejects.toThrow('Circular CNAME reference detected for a');
  });

  it('throws when the CNAME chain exceeds maxDepth without resolving', async () => {
    const records: Record<string, unknown> = {};
    for (let i = 0; i < 15; i++) records[`n${i}`] = { name: `n${i}`, type: 'CNAME', value: `n${i + 1}` };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    await expect(service.getDnsRecordByDomainName('n0')).rejects.toThrow('Maximum CNAME depth exceeded for n0');
  });

  it('honors a custom maxDepth parameter', async () => {
    const records: Record<string, unknown> = {
      a: { name: 'a', type: 'CNAME', value: 'b' },
      b: { name: 'b', type: 'CNAME', value: 'c' },
      c: { name: 'c', type: 'A', value: '1.1.1.1', ttl: 5 },
    };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    await expect(service.getDnsRecordByDomainName('a', 1)).rejects.toThrow('Maximum CNAME depth exceeded for a');
    expect(await service.getDnsRecordByDomainName('a', 3)).toEqual({ name: 'a', type: 'A', value: '1.1.1.1', ttl: 5 });
  });

  it('resolves a fresh collection handle on every call (does not cache the collection)', async () => {
    const collMgr = fakeCollectionManager(async () => ({ name: 'x', type: 'A', value: '1.1.1.1', ttl: 1 }));
    const service = await importFresh(collMgr);
    await service.getDnsRecordByDomainName('x');
    await service.getDnsRecordByDomainName('x');
    expect(collMgr.getCollection).toHaveBeenCalledTimes(2);
  });

  it('caches individual hops so a repeat lookup within the TTL skips findOne', async () => {
    const collMgr = fakeCollectionManager(async ({ name }) => (name === 'x' ? { name: 'x', type: 'A', value: '1.1.1.1', ttl: 1 } : null));
    const service = await importFresh(collMgr);
    await service.getDnsRecordByDomainName('x');
    await service.getDnsRecordByDomainName('x');
    expect(collMgr.findOne).toHaveBeenCalledTimes(1);
  });

  it('does not leak a mutated name between two chains that share a cached hop', async () => {
    // hopCache stores records by reference - the final clone must not mutate them
    const records: Record<string, unknown> = {
      shared: { name: 'shared', type: 'A', value: '1.2.3.4', ttl: 60 },
      first: { name: 'first', type: 'CNAME', value: 'shared' },
      second: { name: 'second', type: 'CNAME', value: 'shared' },
    };
    const service = await importFresh(fakeCollectionManager(async ({ name }) => records[name] ?? null));
    expect(await service.getDnsRecordByDomainName('first')).toEqual({ name: 'first', type: 'A', value: '1.2.3.4', ttl: 60 });
    expect(await service.getDnsRecordByDomainName('second')).toEqual({ name: 'second', type: 'A', value: '1.2.3.4', ttl: 60 });
  });
});
