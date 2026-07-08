import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Every class appContainer.ts registers is replaced with a lightweight fake
 * that records its constructor args, tagged with __mockName — so we can verify
 * (a) the right class backs each DI key and (b) dependencies were wired to the
 * correct singleton instances, without constructing real infrastructure.
 */
function fakeClass(name: string) {
  return class {
    __mockName = name;
    __args: unknown[];
    constructor(...args: unknown[]) {
      this.__args = args;
    }
  };
}

const MongoConnectionManagerMock = fakeClass('MongoConnectionManager');
const MongoCollectionManagerMock = fakeClass('MongoCollectionManager');
const RabbitMQConnectionManagerMock = fakeClass('RabbitMQConnectionManager');
const RabbitMQQueueManagerMock = fakeClass('RabbitMQQueueManager');
const RabbitMQPublisherMock = fakeClass('RabbitMQPublisher');
const RabbitMQConsumerMock = fakeClass('RabbitMQConsumer');
const RabbitMQServiceMock = fakeClass('RabbitMQService');
const RedisConnectionManagerMock = fakeClass('RedisConnectionManager');
const RedisCacheStoreMock = fakeClass('RedisCacheStore');
const RedisPubSubMock = fakeClass('RedisPubSub');
const AclBlockingServiceMock = fakeClass('AclBlockingService');
const RedisCacheServiceMock = fakeClass('RedisCacheService');
const GlobalDNSforwarderServiceMock = fakeClass('GlobalDNSforwarderService');
const DNSMock = fakeClass('DNS');
const DNS_TCPMock = fakeClass('DNS_TCP');
const DNS_DoTMock = fakeClass('DNS_DoT');
const StartRulesServiceMock = fakeClass('StartRulesService');
const BlockListMock = fakeClass('BlockList');
const ServiceStatusCheckerMock = fakeClass('ServiceStatusChecker');
const DomainDBPoolServiceMock = fakeClass('DomainDBPoolService');

vi.mock('@web/Database/MongoConnectionManager', () => ({ MongoConnectionManager: MongoConnectionManagerMock }));
vi.mock('@web/Database/MongoCollectionManager', () => ({ MongoCollectionManager: MongoCollectionManagerMock }));
vi.mock('@web/RabbitMQ/RabbitMQConnectionManager', () => ({ RabbitMQConnectionManager: RabbitMQConnectionManagerMock }));
vi.mock('@web/RabbitMQ/RabbitMQQueueManager', () => ({ RabbitMQQueueManager: RabbitMQQueueManagerMock }));
vi.mock('@web/RabbitMQ/RabbitMQPublisher', () => ({ RabbitMQPublisher: RabbitMQPublisherMock }));
vi.mock('@web/RabbitMQ/RabbitMQConsumer', () => ({ RabbitMQConsumer: RabbitMQConsumerMock }));
vi.mock('@web/RabbitMQ/Rabbitmq.config', () => ({ RabbitMQService: RabbitMQServiceMock }));
vi.mock('@web/Redis/RedisConnectionManager', () => ({ RedisConnectionManager: RedisConnectionManagerMock }));
vi.mock('@web/Redis/RedisCacheStore', () => ({ RedisCacheStore: RedisCacheStoreMock }));
vi.mock('@web/Redis/RedisPubSub', () => ({ RedisPubSub: RedisPubSubMock }));
vi.mock('@web/Redis/AclBlockingService', () => ({ AclBlockingService: AclBlockingServiceMock }));
vi.mock('@web/Redis/Redis.cache', () => ({ RedisCacheService: RedisCacheServiceMock }));
vi.mock('@web/services/Forwarder/GlobalDNSforwarder.service', () => ({ GlobalDNSforwarderService: GlobalDNSforwarderServiceMock }));
vi.mock('@web/services/DNS/DNS.Service', () => ({ default: DNSMock }));
vi.mock('@web/services/DNS/DNS_TCP.Service', () => ({ default: DNS_TCPMock }));
vi.mock('@web/services/DNS/DNS_DoT.Service', () => ({ default: DNS_DoTMock }));
vi.mock('@web/services/Start/Rules.service', () => ({ default: StartRulesServiceMock }));
vi.mock('@web/services/Rules/BlockList.service', () => ({ default: BlockListMock }));
vi.mock('@web/services/Start/ServiceStatusChecker.service', () => ({ default: ServiceStatusCheckerMock }));
vi.mock('@web/services/DB/DB_Pool.service', () => ({ DomainDBPoolService: DomainDBPoolServiceMock }));

async function importFresh() {
  vi.resetModules();
  // Stub process.on: appContainer registers real SIGINT/SIGTERM handlers at
  // import time; importing fresh per test would otherwise pile up real
  // listeners on the shared `process`. We still capture the handler to invoke it.
  const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
  const { default: container } = await import('@web/container/appContainer');
  return { container, processOnSpy };
}

const EXPECTED_KEYS = [
  'MongoConnectionManager', 'MongoCollectionManager',
  'RabbitMQConnectionManager', 'RabbitMQQueueManager', 'RabbitMQPublisher', 'RabbitMQConsumer', 'RabbitMQService',
  'RedisConnectionManager', 'RedisCacheStore', 'RedisPubSub', 'AclBlockingService', 'RedisCacheService',
  'GlobalDNSforwarder', 'DNS', 'DNS_TCP', 'DNS_DoT',
  'StartRulesService', 'BlockList', 'ServiceStatusChecker', 'DomainDBPoolService',
];

describe('appContainer — DI wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers every expected service key', async () => {
    const { container } = await importFresh();
    for (const key of EXPECTED_KEYS) expect(container.has(key)).toBe(true);
  });

  it('every service resolves as a singleton (same instance across get() calls)', async () => {
    const { container } = await importFresh();
    for (const key of EXPECTED_KEYS) expect(container.get(key)).toBe(container.get(key));
  });

  it('MongoCollectionManager is constructed with the MongoConnectionManager singleton', async () => {
    const { container } = await importFresh();
    const collMgr = container.get<InstanceType<typeof MongoCollectionManagerMock>>('MongoCollectionManager');
    expect(collMgr.__args[0]).toBe(container.get('MongoConnectionManager'));
  });

  it('RabbitMQService is wired from the 4 RabbitMQ singletons in order', async () => {
    const { container } = await importFresh();
    const svc = container.get<InstanceType<typeof RabbitMQServiceMock>>('RabbitMQService');
    expect(svc.__args).toEqual([
      container.get('RabbitMQConnectionManager'),
      container.get('RabbitMQQueueManager'),
      container.get('RabbitMQPublisher'),
      container.get('RabbitMQConsumer'),
    ]);
  });

  it('RabbitMQPublisher and RabbitMQConsumer both share the same connection+queue managers', async () => {
    const { container } = await importFresh();
    const publisher = container.get<InstanceType<typeof RabbitMQPublisherMock>>('RabbitMQPublisher');
    const consumer = container.get<InstanceType<typeof RabbitMQConsumerMock>>('RabbitMQConsumer');
    expect(publisher.__args[0]).toBe(container.get('RabbitMQConnectionManager'));
    expect(publisher.__args[1]).toBe(container.get('RabbitMQQueueManager'));
    expect(consumer.__args[0]).toBe(container.get('RabbitMQConnectionManager'));
    expect(consumer.__args[1]).toBe(container.get('RabbitMQQueueManager'));
  });

  it('RedisCacheService is wired from the 4 Redis singletons in order', async () => {
    const { container } = await importFresh();
    const svc = container.get<InstanceType<typeof RedisCacheServiceMock>>('RedisCacheService');
    expect(svc.__args).toEqual([
      container.get('RedisConnectionManager'),
      container.get('RedisCacheStore'),
      container.get('RedisPubSub'),
      container.get('AclBlockingService'),
    ]);
  });

  it('RedisPubSub receives a getRedisConfig accessor bound to the RedisConnectionManager singleton', async () => {
    const { container } = await importFresh();
    const pubSub = container.get<InstanceType<typeof RedisPubSubMock>>('RedisPubSub');
    expect(pubSub.__args[0]).toBe(container.get('RedisConnectionManager'));
    expect(typeof pubSub.__args[1]).toBe('function');
  });

  it('DNS/rule-processing services take no constructor args (resolve their own deps internally)', async () => {
    const { container } = await importFresh();
    for (const key of ['DNS', 'DNS_TCP', 'DNS_DoT', 'StartRulesService', 'BlockList', 'ServiceStatusChecker', 'DomainDBPoolService', 'GlobalDNSforwarder']) {
      expect(container.get<{ __args: unknown[] }>(key).__args).toEqual([]);
    }
  });
});

describe('appContainer — graceful shutdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a SIGINT and a SIGTERM handler', async () => {
    const { processOnSpy } = await importFresh();
    const signals = processOnSpy.mock.calls.map((c) => c[0]);
    expect(signals).toContain('SIGINT');
    expect(signals).toContain('SIGTERM');
  });

  it('on SIGINT, closes RabbitMQ/Redis/Mongo (independently via allSettled) then exits 0', async () => {
    const { container, processOnSpy } = await importFresh();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const rabbit = container.get('RabbitMQService') as unknown as { close?: () => Promise<void> };
    const redis = container.get('RedisConnectionManager') as unknown as { close?: () => Promise<void> };
    const mongo = container.get('MongoConnectionManager') as unknown as { close?: () => Promise<void> };
    rabbit.close = vi.fn().mockResolvedValue(undefined);
    redis.close = vi.fn().mockRejectedValue(new Error('already closed')); // must not block the others
    mongo.close = vi.fn().mockResolvedValue(undefined);

    const sigintHandler = processOnSpy.mock.calls.find((c) => c[0] === 'SIGINT')?.[1] as () => Promise<void>;
    await sigintHandler();

    expect(rabbit.close).toHaveBeenCalledTimes(1);
    expect(redis.close).toHaveBeenCalledTimes(1);
    expect(mongo.close).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
