import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

/** Fake of a MongoDB `Collection` — only the methods the codebase calls. */
export function createFakeCollection() {
  return {
    findOne: vi.fn(),
    collection: vi.fn(),
  };
}

export type FakeCollection = ReturnType<typeof createFakeCollection>;

/** Fake of a MongoDB `Db` — `collection(name)` returns a per-name FakeCollection. */
export function createFakeDb() {
  const collections = new Map<string, FakeCollection>();
  const admin = { ping: vi.fn().mockResolvedValue(true) };

  const db = {
    collection: vi.fn((name: string) => {
      if (!collections.has(name)) collections.set(name, createFakeCollection());
      return collections.get(name)!;
    }),
    admin: vi.fn(() => admin),
  };

  return { db, collections, admin };
}

/** Fake of `MongoClient` — extends EventEmitter so `.on('error'|'connectionPoolClosed'|'connectionCreated', ...)` works. */
export class FakeMongoClient extends EventEmitter {
  public dbInstance: ReturnType<typeof createFakeDb>;

  connect = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  constructor() {
    super();
    this.dbInstance = createFakeDb();
  }

  db = vi.fn(() => this.dbInstance.db);
}
