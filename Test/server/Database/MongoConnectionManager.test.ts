import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeMongoClient } from '../_testUtils/fakeMongo';

const { MongoClientMock } = vi.hoisted(() => ({ MongoClientMock: vi.fn() }));
vi.mock('mongodb', () => ({ MongoClient: MongoClientMock }));
vi.mock('@server/source/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { MongoConnectionManager } from '@server/source/Database/MongoConnectionManager';

let clients: FakeMongoClient[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  clients = [];
  // Must be a `function` (not an arrow) so `new MongoClient(...)` returns it.
  MongoClientMock.mockImplementation(function () {
    const c = new FakeMongoClient();
    clients.push(c);
    return c;
  });
});
afterEach(() => { delete process.env.MONGO_URI; });

describe('MongoConnectionManager.connect', () => {
  it('creates a client, connects, and returns it', async () => {
    const m = new MongoConnectionManager();
    const client = await m.connect();
    expect(MongoClientMock).toHaveBeenCalledTimes(1);
    expect(client).toBe(clients[0]);
    expect(clients[0].connect).toHaveBeenCalledTimes(1);
  });

  it('reuses a live client (verified by an admin ping)', async () => {
    const m = new MongoConnectionManager();
    await m.connect();
    await m.connect();
    expect(MongoClientMock).toHaveBeenCalledTimes(1);
    expect(clients[0].dbInstance.admin.ping).toHaveBeenCalled();
  });

  it('reconnects with a fresh client when the existing one is dead', async () => {
    const m = new MongoConnectionManager();
    await m.connect();
    clients[0].dbInstance.admin.ping.mockRejectedValueOnce(new Error('dead'));

    const client2 = await m.connect();

    expect(MongoClientMock).toHaveBeenCalledTimes(2);
    expect(client2).toBe(clients[1]);
  });

  it('configures a bounded connection pool (20–50)', async () => {
    await new MongoConnectionManager().connect();
    const opts = MongoClientMock.mock.calls[0][1];
    expect(opts.maxPoolSize).toBeGreaterThanOrEqual(20);
    expect(opts.maxPoolSize).toBeLessThanOrEqual(50);
  });

  it('clears the client and rethrows when the driver fails to connect', async () => {
    const m = new MongoConnectionManager();
    MongoClientMock.mockImplementationOnce(function () {
      const c = new FakeMongoClient();
      c.connect.mockRejectedValue(new Error('refused'));
      clients.push(c);
      return c;
    });
    await expect(m.connect()).rejects.toThrow('refused');
    expect(await m.isConnected()).toBe(false);
  });
});

describe('MongoConnectionManager.getDatabase', () => {
  it('throws before a connection is established', () => {
    expect(() => new MongoConnectionManager().getDatabase()).toThrowError(/not connected/);
  });

  it('returns the named database once connected', async () => {
    const m = new MongoConnectionManager();
    await m.connect();
    expect(m.getDatabase()).toBe(clients[0].dbInstance.db);
  });
});

describe('MongoConnectionManager.isConnected / close / events', () => {
  it('isConnected is false before connect, true after, false after a failed ping', async () => {
    const m = new MongoConnectionManager();
    expect(await m.isConnected()).toBe(false);
    await m.connect();
    expect(await m.isConnected()).toBe(true);
    clients[0].dbInstance.admin.ping.mockRejectedValueOnce(new Error('x'));
    expect(await m.isConnected()).toBe(false);
  });

  it('close() closes the client and clears the reference', async () => {
    const m = new MongoConnectionManager();
    await m.connect();
    await m.close();
    expect(clients[0].close).toHaveBeenCalledTimes(1);
    expect(await m.isConnected()).toBe(false);
  });

  it('close() is a no-op when never connected', async () => {
    await new MongoConnectionManager().close();
    expect(clients).toHaveLength(0);
  });

  it('registered event handlers do not throw when emitted', async () => {
    const m = new MongoConnectionManager();
    await m.connect();
    expect(() => {
      clients[0].emit('error', new Error('x'));
      clients[0].emit('connectionPoolClosed');
      clients[0].emit('connectionCreated');
      clients[0].emit('connectionCreated'); // second time: connectionLogged guard
    }).not.toThrow();
  });
});
