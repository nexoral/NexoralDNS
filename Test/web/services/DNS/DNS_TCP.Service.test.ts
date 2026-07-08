import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { createFakeNetServer, FakeNetServer } from '@testUtils/fakeNetServer';
import { createFakeNetSocket } from '@testUtils/fakeNetSocket';

const { mockContainer, createServerMock, getLocalIPMock } = vi.hoisted(() => ({
  mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() },
  createServerMock: vi.fn(),
  getLocalIPMock: vi.fn(() => '192.168.1.50'),
}));

vi.mock('node:net', () => ({ default: { createServer: createServerMock } }));
vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('@web/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@web/utilities/GetWLANIP.utls', () => ({ default: getLocalIPMock }));

async function importFresh() {
  vi.resetModules();
  const rulesService = { execute: vi.fn().mockResolvedValue(undefined) };
  const mongoConnManager = { connect: vi.fn().mockResolvedValue(undefined) };
  const mongoCollManager = { initialize: vi.fn().mockResolvedValue(undefined) };
  Object.assign(mockContainer, createMockContainer({
    StartRulesService: rulesService,
    MongoConnectionManager: mongoConnManager,
    MongoCollectionManager: mongoCollManager,
  }));
  const { default: DNS_TCP } = await import('@web/services/DNS/DNS_TCP.Service');
  return { DNS_TCP, rulesService, mongoConnManager, mongoCollManager };
}

function lenPrefixed(payload: Buffer): Buffer {
  const prefix = Buffer.alloc(2);
  prefix.writeUInt16BE(payload.length, 0);
  return Buffer.concat([prefix, payload]);
}

describe('DNS_TCP (TCP DNS service)', () => {
  let server: FakeNetServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createFakeNetServer();
    createServerMock.mockReturnValue(server);
    getLocalIPMock.mockReturnValue('192.168.1.50');
  });

  it('constructs a non-half-open TCP server and resolves StartRulesService from the container', async () => {
    const { DNS_TCP } = await importFresh();
    new DNS_TCP();
    expect(createServerMock).toHaveBeenCalledWith({ allowHalfOpen: false });
    expect(mockContainer.get).toHaveBeenCalledWith('StartRulesService');
  });

  it('start() connects Mongo and binds to port 53 on getLocalIP("any")', async () => {
    const { DNS_TCP, mongoConnManager, mongoCollManager } = await importFresh();
    new DNS_TCP().start();
    await Promise.resolve();
    expect(server.listen).toHaveBeenCalledWith(53, '192.168.1.50');
    expect(mongoConnManager.connect).toHaveBeenCalledTimes(1);
    expect(mongoCollManager.initialize).toHaveBeenCalledTimes(1);
  });

  it('start()/listen()/listenError()/close() all return `this` for chaining', async () => {
    const { DNS_TCP } = await importFresh();
    const dns = new DNS_TCP();
    expect(dns.start()).toBe(dns);
    expect(dns.listen()).toBe(dns);
    expect(dns.listenError()).toBe(dns);
    expect(dns.close()).toBe(dns);
  });

  it('assembles a single length-prefixed DNS message and dispatches it to StartRulesService', async () => {
    const { DNS_TCP, rulesService } = await importFresh();
    new DNS_TCP().listen();
    const socket = createFakeNetSocket({ remoteAddress: '10.0.0.3', remotePort: 5555 });
    server.emit('connection', socket);

    const dnsMsg = Buffer.from([1, 2, 3, 4]);
    socket.emit('data', lenPrefixed(dnsMsg));
    await new Promise((r) => setImmediate(r));

    expect(rulesService.execute).toHaveBeenCalledTimes(1);
    const [passedMsg, rinfo] = rulesService.execute.mock.calls[0];
    expect(passedMsg).toEqual(dnsMsg);
    expect(rinfo).toMatchObject({ address: '10.0.0.3', port: 5555 });
  });

  it('buffers a message split across multiple TCP data chunks', async () => {
    const { DNS_TCP, rulesService } = await importFresh();
    new DNS_TCP().listen();
    const socket = createFakeNetSocket();
    server.emit('connection', socket);

    const dnsMsg = Buffer.from([9, 9, 9, 9, 9]);
    const framed = lenPrefixed(dnsMsg);
    socket.emit('data', framed.subarray(0, 3));
    await new Promise((r) => setImmediate(r));
    expect(rulesService.execute).not.toHaveBeenCalled();

    socket.emit('data', framed.subarray(3));
    await new Promise((r) => setImmediate(r));
    expect(rulesService.execute).toHaveBeenCalledTimes(1);
    expect(rulesService.execute.mock.calls[0][0]).toEqual(dnsMsg);
  });

  it('processes multiple pipelined messages delivered in a single data event', async () => {
    const { DNS_TCP, rulesService } = await importFresh();
    new DNS_TCP().listen();
    const socket = createFakeNetSocket();
    server.emit('connection', socket);

    socket.emit('data', Buffer.concat([lenPrefixed(Buffer.from([1])), lenPrefixed(Buffer.from([2, 2]))]));
    await new Promise((r) => setImmediate(r));

    expect(rulesService.execute).toHaveBeenCalledTimes(2);
    expect(rulesService.execute.mock.calls[0][0]).toEqual(Buffer.from([1]));
    expect(rulesService.execute.mock.calls[1][0]).toEqual(Buffer.from([2, 2]));
  });

  it('destroys the socket on a connection error', async () => {
    const { DNS_TCP } = await importFresh();
    new DNS_TCP().listen();
    const socket = createFakeNetSocket();
    server.emit('connection', socket);
    socket.emit('error', new Error('ECONNRESET'));
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('destroys the socket after 30s of inactivity (idle timeout)', async () => {
    const { DNS_TCP } = await importFresh();
    new DNS_TCP().listen();
    const socket = createFakeNetSocket();
    server.emit('connection', socket);
    expect(socket.setTimeout).toHaveBeenCalledWith(30_000);
    socket.emit('timeout');
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('listenError() logs and closes the server on a server-level error', async () => {
    const { DNS_TCP } = await importFresh();
    new DNS_TCP().listenError();
    server.emit('error', new Error('EADDRINUSE'));
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('close() closes the underlying server', async () => {
    const { DNS_TCP } = await importFresh();
    new DNS_TCP().close();
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
