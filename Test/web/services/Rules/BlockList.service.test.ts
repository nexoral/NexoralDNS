import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';

const { mockContainer } = vi.hoisted(() => ({ mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() } }));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

async function importFresh() {
  vi.resetModules();
  const redisCacheService = {
    isDomainBlocked: vi.fn().mockResolvedValue(false),
    getBlockedDomainsForIP: vi.fn().mockResolvedValue([]),
    getGloballyBlockedDomains: vi.fn().mockResolvedValue([]),
    getACLMetadata: vi.fn().mockResolvedValue(null),
  };
  Object.assign(mockContainer, createMockContainer({ RedisCacheService: redisCacheService }));
  const { default: BlockList } = await import('@web/services/Rules/BlockList.service');
  return { BlockList, redisCacheService };
}

describe('BlockList.checkDomain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queries Redis on a cold cache and returns the blocked verdict (lowercased)', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(true);
    const bl = new BlockList();
    expect(await bl.checkDomain('Facebook.com', '10.0.0.1')).toBe(true);
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledWith('10.0.0.1', 'facebook.com');
  });

  it('serves a second identical check from the global cache (fast path) within 3s, not hitting Redis again', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(true);
    const bl = new BlockList();
    await bl.checkDomain('a.com', '10.0.0.1');
    vi.setSystemTime(2000); // within the 3s global cache TTL
    expect(await bl.checkDomain('a.com', '10.0.0.1')).toBe(true);
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(1);
  });

  it('serves from the local cache (2nd layer) after the global cache expires but the local TTL is fresh', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValueOnce(true);
    const bl = new BlockList();
    await bl.checkDomain('a.com', '10.0.0.1');
    vi.setSystemTime(4000); // global (3s) expired, local (5s) still valid
    expect(await bl.checkDomain('a.com', '10.0.0.1')).toBe(true);
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(1);
  });

  it('re-queries Redis once BOTH the global and local caches have expired (past 5s)', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const bl = new BlockList();
    await bl.checkDomain('a.com', '10.0.0.1');
    vi.setSystemTime(6000);
    expect(await bl.checkDomain('a.com', '10.0.0.1')).toBe(false);
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(2);
  });

  it('fails open (returns false) when the Redis lookup errors', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockRejectedValue(new Error('down'));
    const bl = new BlockList();
    expect(await bl.checkDomain('a.com', '10.0.0.1')).toBe(false);
  });

  it('keys the cache per (IP, domain) pair — different IPs are independent', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(true);
    const bl = new BlockList();
    await bl.checkDomain('a.com', '10.0.0.1');
    await bl.checkDomain('a.com', '10.0.0.2');
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(2);
  });
});

describe('BlockList.checkDomainWithDetails', () => {
  it('includes a reason when blocked and omits it when allowed', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const bl = new BlockList();
    const blocked = await bl.checkDomainWithDetails('a.com', '10.0.0.1');
    expect(blocked.blocked).toBe(true);
    expect(blocked.reason).toBe('Access Control Policy');
    const allowed = await bl.checkDomainWithDetails('b.com', '10.0.0.1');
    expect(allowed.blocked).toBe(false);
    expect(allowed.reason).toBeUndefined();
  });
});

describe('BlockList.getBlockedDomainsForClient', () => {
  it('merges and de-duplicates IP-scoped + global blocked domains', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.getBlockedDomainsForIP.mockResolvedValue(['a.com', 'shared.com']);
    redisCacheService.getGloballyBlockedDomains.mockResolvedValue(['shared.com', 'b.com']);
    const bl = new BlockList();
    const result = await bl.getBlockedDomainsForClient('10.0.0.1');
    expect(new Set(result)).toEqual(new Set(['a.com', 'shared.com', 'b.com']));
    expect(result).toHaveLength(3);
  });

  it('returns [] on error', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.getBlockedDomainsForIP.mockRejectedValue(new Error('down'));
    const bl = new BlockList();
    expect(await bl.getBlockedDomainsForClient('10.0.0.1')).toEqual([]);
  });
});

describe('BlockList.getACLStats', () => {
  it('returns the ACL metadata', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.getACLMetadata.mockResolvedValue({ totalPolicies: 3 });
    expect(await new BlockList().getACLStats()).toEqual({ totalPolicies: 3 });
  });

  it('returns null on error', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.getACLMetadata.mockRejectedValue(new Error('down'));
    expect(await new BlockList().getACLStats()).toBeNull();
  });
});

describe('BlockList.checkDomainsBatch', () => {
  it('checks every domain in parallel and returns a Map of results', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockImplementation(async (_ip: string, domain: string) => domain === 'bad.com');
    const result = await new BlockList().checkDomainsBatch(['good.com', 'bad.com'], '10.0.0.1');
    expect(result.get('good.com')).toBe(false);
    expect(result.get('bad.com')).toBe(true);
  });
});

describe('BlockList cache maintenance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clearAllCaches() clears the local cache of the most recently constructed instance', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(true);
    const bl = new BlockList();
    await bl.checkDomain('a.com', '10.0.0.1');

    BlockList.clearAllCaches();

    redisCacheService.isDomainBlocked.mockClear();
    await bl.checkDomain('a.com', '10.0.0.1');
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(1);
  });

  it('prunes stale entries via cleanLocalCache() once the local cache exceeds 1000 entries', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(false);
    const bl = new BlockList();

    // Seed 1001 distinct entries at t=0 (all fresh, so the size-triggered clean deletes nothing yet).
    for (let i = 0; i < 1001; i++) await bl.checkDomain(`d${i}.com`, '10.0.0.1');

    // Advance past the 5s local TTL so every seeded entry is now stale, then insert one
    // more: size (>1000) re-triggers cleanLocalCache(), which this time prunes the stale ones.
    vi.setSystemTime(10_000);
    await bl.checkDomain('trigger.com', '10.0.0.1');

    // A pruned domain (both caches now stale/missing) forces a fresh Redis lookup.
    redisCacheService.isDomainBlocked.mockClear();
    await bl.checkDomain('d0.com', '10.0.0.1');
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledWith('10.0.0.1', 'd0.com');
  });

  it('cleanGlobalCache() drops entries older than the global TTL and keeps fresh ones', async () => {
    const { BlockList, redisCacheService } = await importFresh();
    redisCacheService.isDomainBlocked.mockResolvedValue(true);
    const bl = new BlockList();

    await bl.checkDomain('old.com', '10.0.0.1'); // stamped at t=0
    vi.setSystemTime(5000); // 5s later: the t=0 entry is now stale for the 3s global TTL
    await bl.checkDomain('fresh.com', '10.0.0.2'); // stamped at t=5000

    BlockList.cleanGlobalCache();

    // The pruned "old.com" entry forces a fresh Redis lookup; "fresh.com" is still cached.
    redisCacheService.isDomainBlocked.mockClear();
    await bl.checkDomain('old.com', '10.0.0.1');
    await bl.checkDomain('fresh.com', '10.0.0.2');
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledTimes(1);
    expect(redisCacheService.isDomainBlocked).toHaveBeenCalledWith('10.0.0.1', 'old.com');
  });
});
