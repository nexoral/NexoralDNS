import { describe, it, expect, vi } from 'vitest';
import { MongoCollectionManager } from '@web/Database/MongoCollectionManager';
import type { MongoConnectionManager } from '@nexoralShared/Database/MongoConnectionManager';

vi.mock('nexoraldns-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('nexoraldns-shared')>();
  return { ...actual, logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } };
});

function createFakeConnectionManager() {
  const collectionCalls: string[] = [];
  const fakeDb = {
    collection: vi.fn((name: string) => {
      collectionCalls.push(name);
      return { __collection: name };
    }),
  };
  return {
    connect: vi.fn().mockResolvedValue({ db: () => fakeDb }),
    getDatabase: vi.fn().mockReturnValue(fakeDb),
    collectionCalls,
    fakeDb,
  };
}

describe('MongoCollectionManager', () => {
  it('initialize() connects and touches all 9 expected collections exactly once each', async () => {
    const conn = createFakeConnectionManager();
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);

    await manager.initialize();

    expect(conn.connect).toHaveBeenCalledTimes(1);
    expect(conn.collectionCalls.sort()).toEqual(
      ['permissions', 'roles', 'users', 'service', 'domains', 'dns_records', 'analytics', 'logs', 'rules'].sort()
    );
  });

  it('initialize() is idempotent: a second call does not reconnect', async () => {
    const conn = createFakeConnectionManager();
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);
    await manager.initialize();
    await manager.initialize();
    expect(conn.connect).toHaveBeenCalledTimes(1);
  });

  it('initialize() propagates a connection failure and does not mark itself initialized', async () => {
    const conn = createFakeConnectionManager();
    conn.connect.mockRejectedValueOnce(new Error('mongo down'));
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);

    await expect(manager.initialize()).rejects.toThrow('mongo down');

    conn.connect.mockResolvedValueOnce({ db: () => conn.fakeDb });
    await manager.initialize();
    expect(conn.connect).toHaveBeenCalledTimes(2);
  });

  it('getCollection() resolves fresh from the current client via getDatabase()', () => {
    const conn = createFakeConnectionManager();
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);
    expect(manager.getCollection('users')).toEqual({ __collection: 'users' });
    expect(conn.getDatabase).toHaveBeenCalledTimes(1);
  });

  it('getCollection() returns undefined and swallows the error when getDatabase() throws (not connected)', () => {
    const conn = createFakeConnectionManager();
    conn.getDatabase.mockImplementation(() => {
      throw new Error('MongoDB client not connected');
    });
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);
    expect(manager.getCollection('users')).toBeUndefined();
  });

  it('getCollection() calls db.collection() fresh on every invocation (not cached)', () => {
    const conn = createFakeConnectionManager();
    const manager = new MongoCollectionManager(conn as unknown as MongoConnectionManager);
    manager.getCollection('domains');
    manager.getCollection('domains');
    expect(conn.fakeDb.collection).toHaveBeenCalledTimes(2);
  });
});
