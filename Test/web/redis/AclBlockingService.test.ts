import { describe, it, expect, vi } from 'vitest';
import { AclBlockingService } from '@web/Redis/AclBlockingService';
import { createFakeRedisClient } from '@testUtils/fakeRedis';
import type { RedisConnectionManager } from '@nexoralShared/Redis/RedisConnectionManager';

vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

function setup() {
  const client = createFakeRedisClient();
  const connectionManager = { getClient: vi.fn().mockResolvedValue(client) };
  const service = new AclBlockingService(connectionManager as unknown as RedisConnectionManager);
  return { client, service };
}

describe('AclBlockingService.getBlockedDomainsForIP / getGloballyBlockedDomains', () => {
  it('merges exact + wildcard members for a given IP', async () => {
    const { client, service } = setup();
    client.sMembers.mockImplementation(async (key: string) =>
      key === 'acl:ip:10.0.0.5:exact' ? ['facebook.com'] : key === 'acl:ip:10.0.0.5:wild' ? ['*.tiktok.com'] : []
    );
    expect(await service.getBlockedDomainsForIP('10.0.0.5')).toEqual(['facebook.com', '*.tiktok.com']);
  });

  it('returns [] on error', async () => {
    const { client, service } = setup();
    client.sMembers.mockRejectedValue(new Error('down'));
    expect(await service.getBlockedDomainsForIP('10.0.0.5')).toEqual([]);
  });

  it('merges global exact + wildcard sets', async () => {
    const { client, service } = setup();
    client.sMembers.mockImplementation(async (key: string) =>
      key === 'acl:all_users:exact' ? ['ads.com'] : key === 'acl:all_users:wild' ? ['*.tracker.net'] : []
    );
    expect(await service.getGloballyBlockedDomains()).toEqual(['ads.com', '*.tracker.net']);
  });

  it('getGloballyBlockedDomains returns [] on error', async () => {
    const { client, service } = setup();
    client.sMembers.mockRejectedValue(new Error('down'));
    expect(await service.getGloballyBlockedDomains()).toEqual([]);
  });
});

describe('AclBlockingService.getACLMetadata', () => {
  it('parses stored JSON metadata', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue(JSON.stringify({ totalPolicies: 5 }));
    expect(await service.getACLMetadata()).toEqual({ totalPolicies: 5 });
  });

  it('returns null when no metadata is stored', async () => {
    const { service } = setup();
    expect(await service.getACLMetadata()).toBeNull();
  });

  it('returns null on error', async () => {
    const { client, service } = setup();
    client.get.mockRejectedValue(new Error('down'));
    expect(await service.getACLMetadata()).toBeNull();
  });
});

describe('AclBlockingService.isDomainBlocked — fast path (exact match)', () => {
  it('returns true on an IP-scoped exact match', async () => {
    const { client, service } = setup();
    client.sIsMember.mockImplementation(async (key: string, member: string) => key.includes(':ip:') && member === 'facebook.com');
    expect(await service.isDomainBlocked('10.0.0.5', 'facebook.com')).toBe(true);
  });

  it('returns true on a global exact match', async () => {
    const { client, service } = setup();
    client.sIsMember.mockImplementation(async (key: string) => key === 'acl:all_users:exact');
    expect(await service.isDomainBlocked('10.0.0.5', 'ads.com')).toBe(true);
  });

  it('does not fall through to the wildcard scan when the exact match already hits', async () => {
    const { client, service } = setup();
    client.sIsMember.mockResolvedValue(true);
    await service.isDomainBlocked('10.0.0.5', 'facebook.com');
    expect(client.sMembers).not.toHaveBeenCalled();
  });
});

describe('AclBlockingService.isDomainBlocked — wildcard matching', () => {
  function withWildEntries(client: ReturnType<typeof createFakeRedisClient>, entries: string[]) {
    client.sIsMember.mockResolvedValue(false);
    client.sMembers.mockImplementation(async (key: string) => (key.endsWith(':wild') ? entries : []));
  }

  it('"*" blocks every domain', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*']);
    expect(await service.isDomainBlocked('1.1.1.1', 'anything.example')).toBe(true);
  });

  it('"*.example.com" blocks the base domain itself', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*.example.com']);
    expect(await service.isDomainBlocked('1.1.1.1', 'example.com')).toBe(true);
  });

  it('"*.example.com" blocks subdomains', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*.example.com']);
    expect(await service.isDomainBlocked('1.1.1.1', 'mail.example.com')).toBe(true);
  });

  it('"*.example.com" does NOT block a look-alike domain (notexample.com)', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*.example.com']);
    expect(await service.isDomainBlocked('1.1.1.1', 'notexample.com')).toBe(false);
  });

  it('"google.*" blocks google.com and google.co.uk', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['google.*']);
    expect(await service.isDomainBlocked('1.1.1.1', 'google.com')).toBe(true);
    expect(await service.isDomainBlocked('1.1.1.1', 'google.co.uk')).toBe(true);
  });

  it('"google.*" does NOT block a look-alike domain (googlexyz.com)', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['google.*']);
    expect(await service.isDomainBlocked('1.1.1.1', 'googlexyz.com')).toBe(false);
  });

  it('a bare domain stored as a wildcard entry blocks itself and subdomains', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['tiktok.com']);
    expect(await service.isDomainBlocked('1.1.1.1', 'tiktok.com')).toBe(true);
    expect(await service.isDomainBlocked('1.1.1.1', 'www.tiktok.com')).toBe(true);
    expect(await service.isDomainBlocked('1.1.1.1', 'nottiktok.com')).toBe(false);
  });

  it('parses a JSON-wrapped wildcard entry {"domain": "..."}', async () => {
    const { client, service } = setup();
    withWildEntries(client, [JSON.stringify({ domain: '*.blocked.io' })]);
    expect(await service.isDomainBlocked('1.1.1.1', 'sub.blocked.io')).toBe(true);
  });

  it('falls back to the raw string when the entry is not valid JSON', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*.blocked.io']);
    expect(await service.isDomainBlocked('1.1.1.1', 'sub.blocked.io')).toBe(true);
  });

  it('returns false when no exact or wildcard entry matches', async () => {
    const { client, service } = setup();
    withWildEntries(client, ['*.other.com']);
    expect(await service.isDomainBlocked('1.1.1.1', 'safe.example')).toBe(false);
  });

  it('checks both IP-scoped and global wildcard sets', async () => {
    const { client, service } = setup();
    client.sIsMember.mockResolvedValue(false);
    client.sMembers.mockImplementation(async (key: string) => {
      if (key === 'acl:ip:1.1.1.1:wild') return ['*.ip-only.com'];
      if (key === 'acl:all_users:wild') return ['*.global-only.com'];
      return [];
    });
    expect(await service.isDomainBlocked('1.1.1.1', 'x.ip-only.com')).toBe(true);
    expect(await service.isDomainBlocked('1.1.1.1', 'x.global-only.com')).toBe(true);
  });

  it('returns false on a client error (fails closed to "not blocked")', async () => {
    const { client, service } = setup();
    client.sIsMember.mockRejectedValue(new Error('down'));
    expect(await service.isDomainBlocked('1.1.1.1', 'x.com')).toBe(false);
  });
});
