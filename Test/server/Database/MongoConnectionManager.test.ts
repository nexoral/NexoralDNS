import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';
import { FakeMongoClient } from '../_testUtils/fakeMongo';

const { MongoClientCtor } = vi.hoisted(() => ({ MongoClientCtor: vi.fn() }));

vi.mock('mongodb', () => ({ MongoClient: MongoClientCtor }));

// logger.ts constructs a real pino instance (with a worker-thread transport)
// at module-eval time; re-importing it fresh per test via vi.resetModules()
// would spawn a new one each time and leak `process` exit listeners.
vi.mock('@nexoralShared/utilities/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

async function importFresh() {
  vi.resetModules();
  const { MongoConnectionManager } = await import('@nexoralShared/Database/MongoConnectionManager');
  return MongoConnectionManager;
}

describe('MongoConnectionManager', () => {
  let client: FakeMongoClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new FakeMongoClient();
    // Must be a regular function, not an arrow function: `new MongoClient(...)`
    // invokes this via `new`, and arrow functions cannot be constructors.
    MongoClientCtor.mockImplementation(function () {
      return client;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.MONGO_DB_NAME;
  });

  it('connects and returns the MongoClient on first call', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    expect(await manager.connect()).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('reuses an already-connected client when ping succeeds', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    const second = await manager.connect();
    expect(second).toBe(client);
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.dbInstance.admin.ping).toHaveBeenCalledTimes(1);
  });

  it('reconnects with a fresh client when the ping on the existing client fails', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();

    client.dbInstance.admin.ping.mockRejectedValueOnce(new Error('connection dead'));
    const secondClient = new FakeMongoClient();
    MongoClientCtor.mockImplementationOnce(function () {
      return secondClient;
    });

    expect(await manager.connect()).toBe(secondClient);
    expect(secondClient.connect).toHaveBeenCalledTimes(1);
  });

  it('computes maxPoolSize within [20, 50] based on 75% of CPU count', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(new Array(8).fill({}) as os.CpuInfo[]); // 6 workers -> 200/6=33
    const MongoConnectionManager = await importFresh();
    await new MongoConnectionManager().connect();
    expect(MongoClientCtor.mock.calls[0][1].maxPoolSize).toBe(33);
  });

  it('clamps maxPoolSize to 50 when few workers would imply a larger per-worker share', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(new Array(1).fill({}) as os.CpuInfo[]); // 1 worker -> 200
    const MongoConnectionManager = await importFresh();
    await new MongoConnectionManager().connect();
    expect(MongoClientCtor.mock.calls[0][1].maxPoolSize).toBe(50);
  });

  it('clamps maxPoolSize to 20 when many workers would imply a smaller per-worker share', async () => {
    vi.spyOn(os, 'cpus').mockReturnValue(new Array(64).fill({}) as os.CpuInfo[]); // 48 workers -> 4
    const MongoConnectionManager = await importFresh();
    await new MongoConnectionManager().connect();
    expect(MongoClientCtor.mock.calls[0][1].maxPoolSize).toBe(20);
  });

  it('rethrows and resets the client to null when MongoClient.connect() rejects', async () => {
    const MongoConnectionManager = await importFresh();
    client.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const manager = new MongoConnectionManager();

    await expect(manager.connect()).rejects.toThrow('ECONNREFUSED');
    expect(() => manager.getDatabase()).toThrow('MongoDB client not connected');
  });

  it('serializes concurrent connect() calls: only one MongoClient is constructed', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();

    let resolveConnect!: () => void;
    client.connect.mockImplementation(() => new Promise<void>((resolve) => { resolveConnect = resolve; }));

    const first = manager.connect();
    await Promise.resolve();
    const second = manager.connect();

    resolveConnect();
    const [a, b] = await Promise.all([first, second]);

    expect(a).toBe(client);
    expect(b).toBe(client);
    expect(MongoClientCtor).toHaveBeenCalledTimes(1);
  });

  it('getDatabase() throws when never connected', async () => {
    const MongoConnectionManager = await importFresh();
    expect(() => new MongoConnectionManager().getDatabase()).toThrow('MongoDB client not connected');
  });

  it('getDatabase() returns the nexoral_db database after connecting', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    const db = manager.getDatabase();
    expect(client.db).toHaveBeenCalledWith('nexoral_db');
    expect(db).toBe(client.dbInstance.db);
  });

  it('getDatabase() honors MONGO_DB_NAME when set', async () => {
    process.env.MONGO_DB_NAME = 'custom_db';
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    manager.getDatabase();
    expect(client.db).toHaveBeenCalledWith('custom_db');
  });

  it('close() calls client.close() and resets state so getDatabase() throws again', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    await manager.close();
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(() => manager.getDatabase()).toThrow('MongoDB client not connected');
  });

  it('close() is a no-op when never connected', async () => {
    const MongoConnectionManager = await importFresh();
    await expect(new MongoConnectionManager().close()).resolves.toBeUndefined();
  });

  it('isConnected() returns false when never connected', async () => {
    const MongoConnectionManager = await importFresh();
    expect(await new MongoConnectionManager().isConnected()).toBe(false);
  });

  it('isConnected() returns true when ping succeeds', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    expect(await manager.isConnected()).toBe(true);
  });

  it('isConnected() returns false when ping rejects', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    client.dbInstance.admin.ping.mockRejectedValueOnce(new Error('down'));
    expect(await manager.isConnected()).toBe(false);
  });

  it('registers error/connectionPoolClosed/connectionCreated handlers without throwing when emitted', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    expect(() => {
      client.emit('error', new Error('boom'));
      client.emit('connectionPoolClosed');
      client.emit('connectionCreated');
    }).not.toThrow();
  });

  it('only logs "connection created" once across repeated connectionCreated events', async () => {
    const MongoConnectionManager = await importFresh();
    const manager = new MongoConnectionManager();
    await manager.connect();
    // connectionLogged guard: shared/'s canonical version (based on server's)
    // suppresses duplicate log spam from the pool emitting this per-connection.
    expect(() => {
      client.emit('connectionCreated');
      client.emit('connectionCreated');
    }).not.toThrow();
  });
});
