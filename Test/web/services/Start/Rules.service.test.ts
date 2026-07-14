import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { buildQuery } from '@testUtils/dnsPackets';
import type dgram from 'node:dgram';
import type { IDNSIOHandler } from '@web/utilities/IDNSIOHandler';

const { mockContainer } = vi.hoisted(() => ({ mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() } }));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

const RINFO: dgram.RemoteInfo = { address: '10.0.0.9', port: 5353, family: 'IPv4', size: 0 };

function fakeIO(): IDNSIOHandler & { buildSendAnswer: ReturnType<typeof vi.fn>; sendRawAnswer: ReturnType<typeof vi.fn> } {
  return {
    parseQueryName: vi.fn(() => 'a.com'),
    parseQueryType: vi.fn(() => 'A'),
    parseDNSResponse: vi.fn(),
    buildSendAnswer: vi.fn().mockReturnValue(true),
    sendRawAnswer: vi.fn().mockReturnValue(true),
  };
}

type Deps = {
  blockList: { checkDomain: ReturnType<typeof vi.fn> };
  serviceStatusChecker: { checkServiceStatus: ReturnType<typeof vi.fn> };
  dbPoolService: { getDnsRecordByDomainName: ReturnType<typeof vi.fn> };
  redisCacheService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  rabbitMQService: { publish: ReturnType<typeof vi.fn> };
  forwarder: { forward: ReturnType<typeof vi.fn> };
};

function defaultDeps(): Deps {
  return {
    blockList: { checkDomain: vi.fn().mockResolvedValue(false) },
    serviceStatusChecker: {
      checkServiceStatus: vi.fn().mockResolvedValue({ serviceStatus: true, serviceConfig: { DefaultTTL: 60 } }),
    },
    dbPoolService: { getDnsRecordByDomainName: vi.fn().mockResolvedValue(null) },
    redisCacheService: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
    },
    rabbitMQService: { publish: vi.fn().mockResolvedValue(true) },
    forwarder: { forward: vi.fn().mockResolvedValue(null) },
  };
}

/** Imports a FRESH copy of the module (resetting the `static #subscribed` guard) wired to `deps`. */
async function importFresh(deps: Deps) {
  vi.resetModules();
  Object.assign(
    mockContainer,
    createMockContainer({
      BlockList: deps.blockList,
      ServiceStatusChecker: deps.serviceStatusChecker,
      DomainDBPoolService: deps.dbPoolService,
      RedisCacheService: deps.redisCacheService,
      RabbitMQService: deps.rabbitMQService,
      GlobalDNSforwarder: deps.forwarder,
    })
  );
  const { default: StartRulesService } = await import('@web/services/Start/Rules.service');
  return StartRulesService;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('StartRulesService constructor — cache:invalidate subscription', () => {
  it('subscribes to cache:invalidate exactly once even when multiple instances are constructed', async () => {
    const deps = defaultDeps();
    const StartRulesService = await importFresh(deps);
    new StartRulesService();
    new StartRulesService();
    new StartRulesService();
    expect(deps.redisCacheService.subscribe).toHaveBeenCalledTimes(1);
    expect(deps.redisCacheService.subscribe).toHaveBeenCalledWith('cache:invalidate', expect.any(Function));
  });

  it('the subscribed handler clears BlockList caches and deletes the service-status cache key', async () => {
    const deps = defaultDeps();
    const StartRulesService = await importFresh(deps);
    const { default: BlockList } = await import('@web/services/Rules/BlockList.service');
    const clearSpy = vi.spyOn(BlockList, 'clearAllCaches');

    new StartRulesService();
    const handler = deps.redisCacheService.subscribe.mock.calls[0][1];
    await handler('invalidate-all');

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(deps.redisCacheService.delete).toHaveBeenCalledWith('dns-server-status');
  });

  it('allows a retry on the next construction when the subscribe() call rejects', async () => {
    const deps = defaultDeps();
    deps.redisCacheService.subscribe.mockRejectedValueOnce(new Error('redis down'));
    const StartRulesService = await importFresh(deps);

    new StartRulesService();
    await new Promise((r) => setImmediate(r)); // let the rejection's .catch() handler run
    new StartRulesService();
    await new Promise((r) => setImmediate(r));

    expect(deps.redisCacheService.subscribe).toHaveBeenCalledTimes(2);
  });
});

describe('StartRulesService.execute — guard clauses', () => {
  it('is a no-op when msg is falsy', async () => {
    const deps = defaultDeps();
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(null as unknown as Buffer, RINFO, fakeIO());
    expect(deps.serviceStatusChecker.checkServiceStatus).not.toHaveBeenCalled();
  });

  it('is a no-op when rinfo is falsy', async () => {
    const deps = defaultDeps();
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('a.com'), null as unknown as dgram.RemoteInfo, fakeIO());
    expect(deps.serviceStatusChecker.checkServiceStatus).not.toHaveBeenCalled();
  });
});

describe('StartRulesService.execute — service status layer', () => {
  it('halts and publishes SERVICE_DOWN analytics when the service is inactive', async () => {
    const deps = defaultDeps();
    deps.serviceStatusChecker.checkServiceStatus.mockResolvedValue({ serviceStatus: false, serviceConfig: { Service_Status: 'inactive' } });
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('a.com'), RINFO, fakeIO());
    expect(deps.blockList.checkDomain).not.toHaveBeenCalled();
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith(
      'DNS_analytics',
      expect.objectContaining({ Status: 'SERVICE_DOWN', From: 'SYSTEM' }),
      { persistent: false, priority: 5 }
    );
  });

  it('enters fail-safe bypass (DefaultTTL=0) when checkServiceStatus() throws (DB offline)', async () => {
    const deps = defaultDeps();
    deps.serviceStatusChecker.checkServiceStatus.mockRejectedValue(new Error('mongo down'));
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('a.com'), RINFO, fakeIO());
    expect(deps.blockList.checkDomain).not.toHaveBeenCalled();
    expect(deps.forwarder.forward).toHaveBeenCalledWith(expect.any(Buffer), 'a.com', 'A', 0, RINFO, expect.any(Number), true);
  });
});

describe('StartRulesService.execute — blocklist layer', () => {
  it('sends NXDOMAIN and publishes BLOCKED analytics when the domain is blocked', async () => {
    const deps = defaultDeps();
    deps.blockList.checkDomain.mockResolvedValue(true);
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    const query = buildQuery('a.com');
    await new StartRulesService().execute(query, RINFO, io);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '0.0.0.0', 60);
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith(
      'DNS_analytics',
      expect.objectContaining({ Status: 'BLOCKED', From: 'BY RULE' }),
      { persistent: false, priority: 5 }
    );
    expect(deps.forwarder.forward).not.toHaveBeenCalled();
  });

  it('enters fail-safe bypass when the blocklist check throws', async () => {
    const deps = defaultDeps();
    deps.blockList.checkDomain.mockRejectedValue(new Error('redis down'));
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('a.com'), RINFO, fakeIO());
    expect(deps.forwarder.forward).toHaveBeenCalled();
    const blocked = deps.rabbitMQService.publish.mock.calls.filter((c) => (c[1] as { Status?: string }).Status === 'BLOCKED');
    expect(blocked).toHaveLength(0);
  });
});

describe('StartRulesService.execute — cache/DB record layer', () => {
  it('resolves from cache (FROM_CACHE) without touching the DB', async () => {
    const deps = defaultDeps();
    deps.redisCacheService.get.mockResolvedValue({ name: 'a.com', value: '1.2.3.4', ttl: 60 });
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    const query = buildQuery('a.com');
    await new StartRulesService().execute(query, RINFO, io);
    expect(deps.dbPoolService.getDnsRecordByDomainName).not.toHaveBeenCalled();
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '1.2.3.4', 60);
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith('DNS_analytics', expect.objectContaining({ Status: 'RESOLVED' }), expect.anything());
  });

  it('resolves from the DB on a cache miss and populates the cache (FROM_DB)', async () => {
    const deps = defaultDeps();
    deps.dbPoolService.getDnsRecordByDomainName.mockResolvedValue({ name: 'a.com', value: '5.5.5.5', ttl: 120 });
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    await new StartRulesService().execute(buildQuery('a.com'), RINFO, io);
    expect(deps.redisCacheService.set).toHaveBeenCalledWith('Domain_DNS_Record:a.com', { name: 'a.com', value: '5.5.5.5', ttl: 120 }, 120);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(expect.any(Buffer), RINFO, 'a.com', '5.5.5.5', 120);
  });

  it('deduplicates concurrent lookups for the same domain into a single DB call (single-flight)', async () => {
    const deps = defaultDeps();
    let resolveDb!: (v: unknown) => void;
    deps.dbPoolService.getDnsRecordByDomainName.mockImplementation(() => new Promise((resolve) => { resolveDb = resolve; }));
    const StartRulesService = await importFresh(deps);
    const service = new StartRulesService();

    const p1 = service.execute(buildQuery('a.com'), RINFO, fakeIO());
    const p2 = service.execute(buildQuery('a.com'), RINFO, fakeIO());
    await new Promise((r) => setImmediate(r)); // both reach their single-flight branch

    resolveDb({ name: 'a.com', value: '9.9.9.9', ttl: 30 });
    await Promise.all([p1, p2]);

    expect(deps.dbPoolService.getDnsRecordByDomainName).toHaveBeenCalledTimes(1);
  });

  it('enters fail-safe bypass when the DB lookup throws', async () => {
    const deps = defaultDeps();
    deps.dbPoolService.getDnsRecordByDomainName.mockRejectedValue(new Error('db down'));
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('a.com'), RINFO, fakeIO());
    expect(deps.forwarder.forward).toHaveBeenCalled();
    const resolved = deps.rabbitMQService.publish.mock.calls.filter((c) => (c[1] as { Status?: string }).Status === 'RESOLVED');
    expect(resolved).toHaveLength(0);
  });
});

describe('StartRulesService.execute — forwarding layer', () => {
  it('forwards and relays the raw response when no matching record was found', async () => {
    const deps = defaultDeps();
    const rawResponse = Buffer.from([0x00, 0x01, 0x02]);
    deps.forwarder.forward.mockResolvedValue(rawResponse);
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    await new StartRulesService().execute(buildQuery('unknown.com'), RINFO, io);
    expect(io.sendRawAnswer).toHaveBeenCalledWith(rawResponse, RINFO);
  });

  it('publishes FAILED when sendRawAnswer() fails after a successful forward', async () => {
    const deps = defaultDeps();
    deps.forwarder.forward.mockResolvedValue(Buffer.from([1, 2, 3]));
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    io.sendRawAnswer.mockReturnValue(false);
    await new StartRulesService().execute(buildQuery('unknown.com'), RINFO, io);
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith('DNS_analytics', expect.objectContaining({ Status: 'FAILED TO PROCESS' }), expect.anything());
  });

  it('sends an NXDOMAIN fallback and publishes FAILED when the forwarder returns null', async () => {
    const deps = defaultDeps();
    deps.forwarder.forward.mockResolvedValue(null);
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    const query = buildQuery('unknown.com');
    await new StartRulesService().execute(query, RINFO, io);
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, 'a.com', '0.0.0.0', 0);
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith('DNS_analytics', expect.objectContaining({ Status: 'FAILED TO PROCESS' }), expect.anything());
  });

  it('does NOT publish FAILED analytics for a null forward result while in fail-safe mode', async () => {
    const deps = defaultDeps();
    deps.serviceStatusChecker.checkServiceStatus.mockRejectedValue(new Error('db down'));
    deps.forwarder.forward.mockResolvedValue(null);
    const StartRulesService = await importFresh(deps);
    await new StartRulesService().execute(buildQuery('unknown.com'), RINFO, fakeIO());
    const failed = deps.rabbitMQService.publish.mock.calls.filter((c) => (c[1] as { Status?: string }).Status === 'FAILED TO PROCESS');
    expect(failed).toHaveLength(0);
  });

  it('publishes FAILED when forwarder.forward() itself throws', async () => {
    const deps = defaultDeps();
    deps.forwarder.forward.mockRejectedValue(new Error('socket pool saturated'));
    const StartRulesService = await importFresh(deps);
    await expect(new StartRulesService().execute(buildQuery('unknown.com'), RINFO, fakeIO())).resolves.not.toThrow();
    expect(deps.rabbitMQService.publish).toHaveBeenCalledWith('DNS_analytics', expect.objectContaining({ Status: 'FAILED TO PROCESS' }), expect.anything());
  });
});

describe('StartRulesService.execute — timeout guard', () => {
  it('sends a best-effort SERVFAIL-style fallback and stops after 5s if executeCore never settles', async () => {
    vi.useFakeTimers();
    const deps = defaultDeps();
    deps.serviceStatusChecker.checkServiceStatus.mockImplementation(() => new Promise(() => {})); // never resolves
    const StartRulesService = await importFresh(deps);
    const io = fakeIO();
    const query = buildQuery('a.com');
    const p = new StartRulesService().execute(query, RINFO, io);
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(io.buildSendAnswer).toHaveBeenCalledWith(query, RINFO, '', '0.0.0.0', 0);
  });
});
