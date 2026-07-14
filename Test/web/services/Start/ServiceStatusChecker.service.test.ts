import { describe, it, expect, vi } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { buildQuery } from '@testUtils/dnsPackets';
import type dgram from 'node:dgram';

const { mockContainer } = vi.hoisted(() => ({ mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() } }));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

const RINFO: dgram.RemoteInfo = { address: '10.0.0.1', port: 5353, family: 'IPv4', size: 0 };

function fakeIO() {
  return { buildSendAnswer: vi.fn().mockReturnValue(true), sendRawAnswer: vi.fn(), parseQueryName: vi.fn(), parseQueryType: vi.fn(), parseDNSResponse: vi.fn() };
}

async function importFresh(opts: { redisGet: unknown; collection?: unknown }) {
  vi.resetModules();
  const redisCacheService = { get: vi.fn().mockResolvedValue(opts.redisGet), set: vi.fn().mockResolvedValue(undefined) };
  const mongoCollectionManager = { getCollection: vi.fn().mockReturnValue(opts.collection) };
  Object.assign(mockContainer, createMockContainer({ RedisCacheService: redisCacheService, MongoCollectionManager: mongoCollectionManager }));
  const { default: ServiceStatusChecker } = await import('@web/services/Start/ServiceStatusChecker.service');
  return { checker: new ServiceStatusChecker(), redisCacheService, mongoCollectionManager };
}

describe('ServiceStatusChecker.checkServiceStatus', () => {
  it('returns active=true from a cached active status without touching Mongo', async () => {
    const { checker, mongoCollectionManager } = await importFresh({ redisGet: { Service_Status: 'active', DefaultTTL: 60 } });
    const io = fakeIO();
    const result = await checker.checkServiceStatus('a.com', io, buildQuery('a.com'), RINFO);
    expect(result).toEqual({ serviceStatus: true, serviceConfig: { Service_Status: 'active', DefaultTTL: 60 } });
    expect(io.buildSendAnswer).not.toHaveBeenCalled();
    expect(mongoCollectionManager.getCollection).not.toHaveBeenCalled();
  });

  it('returns active=false and sends NXDOMAIN when the cached status is inactive', async () => {
    const { checker } = await importFresh({ redisGet: { Service_Status: 'inactive' } });
    const io = fakeIO();
    const query = buildQuery('a.com');
    const result = await checker.checkServiceStatus('a.com', io, query, RINFO);
    expect(result.serviceStatus).toBe(false);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '0.0.0.0', 10);
  });

  it('falls back to Mongo on a cache miss and caches the result', async () => {
    const collection = { findOne: vi.fn().mockResolvedValue({ Service_Status: 'active', SERVICE_NAME: 'NexoralDNS' }) };
    const { checker, redisCacheService } = await importFresh({ redisGet: null, collection });
    const result = await checker.checkServiceStatus('a.com', fakeIO(), buildQuery('a.com'), RINFO);
    expect(result).toEqual({ serviceStatus: true, serviceConfig: { Service_Status: 'active', SERVICE_NAME: 'NexoralDNS' } });
    expect(redisCacheService.set).toHaveBeenCalledWith('dns-server-status', { Service_Status: 'active', SERVICE_NAME: 'NexoralDNS' });
  });

  it('sends NXDOMAIN with the configured DefaultTTL when the DB status is inactive', async () => {
    const collection = { findOne: vi.fn().mockResolvedValue({ Service_Status: 'inactive', DefaultTTL: 45 }) };
    const { checker } = await importFresh({ redisGet: null, collection });
    const io = fakeIO();
    const query = buildQuery('a.com');
    const result = await checker.checkServiceStatus('a.com', io, query, RINFO);
    expect(result.serviceStatus).toBe(false);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '0.0.0.0', 45);
  });

  it('defaults TTL to 0 when the inactive DB record has no DefaultTTL', async () => {
    const collection = { findOne: vi.fn().mockResolvedValue({ Service_Status: 'inactive' }) };
    const { checker } = await importFresh({ redisGet: null, collection });
    const io = fakeIO();
    const query = buildQuery('a.com');
    await checker.checkServiceStatus('a.com', io, query, RINFO);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '0.0.0.0', 0);
  });

  it('returns serviceStatus=false, serviceConfig=null when the Mongo collection is unavailable', async () => {
    const { checker } = await importFresh({ redisGet: null, collection: undefined });
    expect(await checker.checkServiceStatus('a.com', fakeIO(), buildQuery('a.com'), RINFO)).toEqual({ serviceStatus: false, serviceConfig: null });
  });

  it('returns serviceStatus=false, serviceConfig=null when no service document exists in Mongo', async () => {
    const collection = { findOne: vi.fn().mockResolvedValue(null) };
    const { checker } = await importFresh({ redisGet: null, collection });
    expect(await checker.checkServiceStatus('a.com', fakeIO(), buildQuery('a.com'), RINFO)).toEqual({ serviceStatus: false, serviceConfig: null });
  });
});
