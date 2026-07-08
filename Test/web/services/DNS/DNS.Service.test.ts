import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { createFakeDgramSocket, FakeDgramSocket } from '@testUtils/fakeDgramSocket';

const { mockContainer, createDnsListenerSocketMock, getLocalIPMock, ipScanCtorMock, ipScanScanMock } = vi.hoisted(() => ({
  mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() },
  createDnsListenerSocketMock: vi.fn(),
  getLocalIPMock: vi.fn(() => '192.168.1.50'),
  ipScanCtorMock: vi.fn(),
  ipScanScanMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('@web/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@web/utilities/dnsSocket.utls', () => ({ createDnsListenerSocket: createDnsListenerSocketMock }));
vi.mock('@web/utilities/GetWLANIP.utls', () => ({ default: getLocalIPMock }));
vi.mock('@web/utilities/AutoIP_SCAN.utls', () => ({
  default: class {
    constructor(...args: unknown[]) {
      ipScanCtorMock(...args);
    }
    scan = ipScanScanMock;
  },
}));

async function importFresh() {
  vi.resetModules();
  const startRulesService = { execute: vi.fn().mockResolvedValue(undefined) };
  const mongoConnManager = { connect: vi.fn().mockResolvedValue(undefined) };
  const mongoCollManager = { initialize: vi.fn().mockResolvedValue(undefined) };
  Object.assign(mockContainer, createMockContainer({
    StartRulesService: startRulesService,
    MongoConnectionManager: mongoConnManager,
    MongoCollectionManager: mongoCollManager,
  }));
  const { default: DNS } = await import('@web/services/DNS/DNS.Service');
  return { DNS, startRulesService, mongoConnManager, mongoCollManager };
}

describe('DNS (UDP service)', () => {
  let socket: FakeDgramSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createFakeDgramSocket();
    createDnsListenerSocketMock.mockReturnValue(socket);
    getLocalIPMock.mockReturnValue('192.168.1.50');
  });

  it('constructor creates the listener socket and resolves StartRulesService from the container', async () => {
    const { DNS } = await importFresh();
    new DNS();
    expect(createDnsListenerSocketMock).toHaveBeenCalledTimes(1);
    expect(mockContainer.get).toHaveBeenCalledWith('StartRulesService');
  });

  it('start() connects Mongo, binds to port 53 on getLocalIP("any"), and starts IP scanning', async () => {
    const { DNS, mongoConnManager, mongoCollManager } = await importFresh();
    const dns = new DNS();
    dns.start();
    await Promise.resolve();
    expect(mongoConnManager.connect).toHaveBeenCalledTimes(1);
    expect(mongoCollManager.initialize).toHaveBeenCalledTimes(1);
    expect(socket.bind).toHaveBeenCalledWith(53, '192.168.1.50');
    expect(ipScanCtorMock).toHaveBeenCalledWith('192.168.1.50', socket, expect.any(Function));
    expect(ipScanScanMock).toHaveBeenCalledTimes(1);
  });

  it('start() returns `this` for chaining', async () => {
    const { DNS } = await importFresh();
    const dns = new DNS();
    expect(dns.start()).toBe(dns);
  });

  it('logs Mongo connection failures instead of throwing', async () => {
    const { DNS, mongoConnManager } = await importFresh();
    mongoConnManager.connect.mockRejectedValue(new Error('mongo down'));
    const dns = new DNS();
    expect(() => dns.start()).not.toThrow();
    await new Promise((r) => setImmediate(r));
  });

  it('listen() dispatches inbound messages to StartRulesService.execute()', async () => {
    const { DNS, startRulesService } = await importFresh();
    const dns = new DNS();
    dns.listen();
    const msg = Buffer.from([1, 2, 3]);
    const rinfo = { address: '10.0.0.1', port: 1234, family: 'IPv4' as const, size: 3 };
    socket.emit('message', msg, rinfo);
    await new Promise((r) => setImmediate(r));
    expect(startRulesService.execute).toHaveBeenCalledWith(msg, rinfo, expect.anything());
  });

  it('listen() returns `this` for chaining', async () => {
    const { DNS } = await importFresh();
    const dns = new DNS();
    expect(dns.listen()).toBe(dns);
  });

  it('listenError() logs and closes the server on a socket error', async () => {
    const { DNS } = await importFresh();
    const dns = new DNS();
    dns.listenError();
    socket.emit('error', new Error('EADDRINUSE'));
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('close() closes the underlying socket', async () => {
    const { DNS } = await importFresh();
    new DNS().close();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('rebinds to a new socket when IP_SCAN invokes the onRebind callback', async () => {
    const { DNS, startRulesService } = await importFresh();
    const dns = new DNS();
    dns.start();
    await Promise.resolve();

    const onRebind = ipScanCtorMock.mock.calls[0][2] as (s: FakeDgramSocket) => void;
    const newSocket = createFakeDgramSocket();
    onRebind(newSocket);

    const msg = Buffer.from([9, 9]);
    const rinfo = { address: '10.0.0.2', port: 4321, family: 'IPv4' as const, size: 2 };
    newSocket.emit('message', msg, rinfo);
    await new Promise((r) => setImmediate(r));
    expect(startRulesService.execute).toHaveBeenCalledWith(msg, rinfo, expect.anything());
  });

  it('re-tunes the socket buffers once the rebound socket fires "listening"', async () => {
    const { DNS } = await importFresh();
    const dns = new DNS();
    dns.start();
    await Promise.resolve();

    const onRebind = ipScanCtorMock.mock.calls[0][2] as (s: FakeDgramSocket) => void;
    const newSocket = createFakeDgramSocket();
    onRebind(newSocket);

    // The rebind handler tunes buffers only after the new socket confirms it is
    // bound via "listening" (bind() is async, so it can't be done inline).
    newSocket.simulateBound('10.0.0.2');
    newSocket.emit('listening');
    expect(newSocket.setRecvBufferSize).toHaveBeenCalledWith(4 * 1024 * 1024);
    expect(newSocket.setSendBufferSize).toHaveBeenCalledWith(4 * 1024 * 1024);
  });

  it('close() after a rebind closes the NEW socket, not the stale original', async () => {
    const { DNS } = await importFresh();
    const dns = new DNS();
    dns.start();
    await Promise.resolve();

    const onRebind = ipScanCtorMock.mock.calls[0][2] as (s: FakeDgramSocket) => void;
    const newSocket = createFakeDgramSocket();
    onRebind(newSocket);

    dns.close();
    expect(newSocket.close).toHaveBeenCalledTimes(1);
    expect(socket.close).not.toHaveBeenCalled();
  });
});
