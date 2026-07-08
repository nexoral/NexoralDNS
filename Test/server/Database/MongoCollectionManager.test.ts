import { describe, it, expect, vi, beforeEach } from 'vitest';

// cluster.isPrimary gates index/default-data setup — controlled per test.
const { clusterState } = vi.hoisted(() => ({ clusterState: { isPrimary: false } }));
vi.mock('cluster', () => ({ default: clusterState }));
vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { MongoCollectionManager } from '@server/source/Database/MongoCollectionManager';
import type { MongoConnectionManager } from '@server/source/Database/MongoConnectionManager';

function makeCol(overrides: Record<string, unknown> = {}) {
  return {
    createIndex: vi.fn().mockResolvedValue('idx'),
    dropIndex: vi.fn().mockResolvedValue(undefined),
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockResolvedValue(null),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'id1' }),
    ...overrides,
  };
}

function makeDb(colFactory: () => Record<string, unknown> = makeCol) {
  const cols = new Map<string, ReturnType<typeof makeCol>>();
  const db = {
    collection: vi.fn((name: string) => {
      if (!cols.has(name)) cols.set(name, colFactory() as ReturnType<typeof makeCol>);
      return cols.get(name)!;
    }),
  };
  return { db, cols };
}

function setup(dbHandle = makeDb()) {
  const client = { db: vi.fn().mockReturnValue(dbHandle.db) };
  const connectionManager = {
    connect: vi.fn().mockResolvedValue(client),
    getDatabase: vi.fn().mockReturnValue(dbHandle.db),
  } as unknown as MongoConnectionManager;
  const manager = new MongoCollectionManager(connectionManager);
  return { manager, connectionManager, dbHandle };
}

beforeEach(() => {
  vi.clearAllMocks();
  clusterState.isPrimary = false;
});

describe('MongoCollectionManager.getCollection', () => {
  it('resolves a collection fresh from the current database', () => {
    const { manager, dbHandle } = setup();
    const col = manager.getCollection('users');
    expect(dbHandle.db.collection).toHaveBeenCalledWith('users');
    expect(col).toBeDefined();
  });

  it('returns undefined (not throw) when the database is unavailable', () => {
    const connectionManager = { getDatabase: vi.fn(() => { throw new Error('down'); }) } as unknown as MongoConnectionManager;
    expect(new MongoCollectionManager(connectionManager).getCollection('users')).toBeUndefined();
  });
});

describe('MongoCollectionManager.initialize', () => {
  it('is idempotent — a second call is a no-op', async () => {
    const { manager, connectionManager } = setup();
    await manager.initialize();
    await manager.initialize();
    expect(connectionManager.connect).toHaveBeenCalledTimes(1);
  });

  it('caches all collections on a worker (non-primary) without setting up indexes', async () => {
    const { manager, dbHandle } = setup();
    await manager.initialize();

    expect(manager.getAllCollections().size).toBeGreaterThan(0);
    // No index creation off the primary.
    for (const col of dbHandle.cols.values()) {
      expect(col.createIndex).not.toHaveBeenCalled();
    }
  });

  it('creates indexes and seeds default data on the primary when the DB is empty', async () => {
    clusterState.isPrimary = true;
    const { manager, dbHandle } = setup();

    await manager.initialize();

    const anyIndexed = [...dbHandle.cols.values()].some((c) => c.createIndex.mock.calls.length > 0);
    const anyInserted = [...dbHandle.cols.values()].some((c) => c.insertOne.mock.calls.length > 0);
    expect(anyIndexed).toBe(true);
    expect(anyInserted).toBe(true);
  });

  it('does not re-seed default data on the primary when it already exists', async () => {
    clusterState.isPrimary = true;
    const populated = makeDb(() => makeCol({
      countDocuments: vi.fn().mockResolvedValue(5),
      findOne: vi.fn().mockResolvedValue({ _id: 'existing' }),
    }));
    const { manager } = setup(populated);

    await manager.initialize();

    for (const col of populated.cols.values()) {
      expect(col.insertOne).not.toHaveBeenCalled();
    }
  });

  it('rethrows when the underlying connection fails', async () => {
    const connectionManager = { connect: vi.fn().mockRejectedValue(new Error('no db')) } as unknown as MongoConnectionManager;
    await expect(new MongoCollectionManager(connectionManager).initialize()).rejects.toThrow('no db');
  });
});

describe('MongoCollectionManager.getAllCollections', () => {
  it('exposes the cached collection map after initialize', async () => {
    const { manager } = setup();
    await manager.initialize();
    expect(manager.getAllCollections()).toBeInstanceOf(Map);
    expect(manager.getAllCollections().size).toBeGreaterThan(0);
  });
});
