import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';
import { createFakeNetServer, FakeNetServer } from '@testUtils/fakeNetServer';
import { createFakeNetSocket } from '@testUtils/fakeNetSocket';

const {
  mockContainer, createServerMock, getLocalIPMock,
  existsSyncMock, readFileSyncMock, writeFileSyncMock, renameSyncMock, unlinkSyncMock, mkdirSyncMock, execFileSyncMock,
} = vi.hoisted(() => ({
  mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() },
  createServerMock: vi.fn(),
  getLocalIPMock: vi.fn(() => '192.168.1.50'),
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  renameSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  execFileSyncMock: vi.fn(),
}));

vi.mock('node:tls', () => ({ default: { createServer: createServerMock } }));
vi.mock('node:fs', () => ({
  default: {
    existsSync: existsSyncMock, readFileSync: readFileSyncMock, writeFileSync: writeFileSyncMock,
    renameSync: renameSyncMock, unlinkSync: unlinkSyncMock, mkdirSync: mkdirSyncMock,
  },
}));
vi.mock('node:child_process', () => ({ execFileSync: execFileSyncMock }));
vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));
vi.mock('@web/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@web/utilities/GetWLANIP.utls', () => ({ default: getLocalIPMock }));

function lenPrefixed(payload: Buffer): Buffer {
  const prefix = Buffer.alloc(2);
  prefix.writeUInt16BE(payload.length, 0);
  return Buffer.concat([prefix, payload]);
}

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
  const mod = await import('@web/services/DNS/DNS_DoT.Service');
  return { DNS_DoT: mod.default, loadOrGenerateCerts: mod.loadOrGenerateCerts, rulesService, mongoConnManager, mongoCollManager };
}

describe('loadOrGenerateCerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads existing cert+key from disk without invoking openssl when both files exist', async () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation((p: string) => Buffer.from(`content-of-${p}`));
    const { loadOrGenerateCerts } = await importFresh();
    const result = loadOrGenerateCerts();
    expect(execFileSyncMock).not.toHaveBeenCalled();
    expect(result.cert.toString()).toContain('server.crt');
    expect(result.key.toString()).toContain('server.key');
  });

  it('generates a self-signed cert via openssl when none exist, and persists it atomically', async () => {
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockImplementation((p: string) =>
      p.toString().includes('.cert.pem') ? Buffer.from('GENERATED_CERT') : Buffer.from('GENERATED_KEY')
    );
    const { loadOrGenerateCerts } = await importFresh();
    const result = loadOrGenerateCerts();
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'openssl',
      expect.arrayContaining(['req', '-x509', '-newkey', 'rsa:2048']),
      expect.objectContaining({ stdio: 'pipe' })
    );
    expect(result.cert.toString()).toBe('GENERATED_CERT');
    expect(result.key.toString()).toBe('GENERATED_KEY');
    expect(mkdirSyncMock).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(writeFileSyncMock).toHaveBeenCalledTimes(2);
    expect(renameSyncMock).toHaveBeenCalledTimes(2);
  });

  it('cleans up the openssl temp files even when generation succeeds', async () => {
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockReturnValue(Buffer.from('x'));
    const { loadOrGenerateCerts } = await importFresh();
    loadOrGenerateCerts();
    expect(unlinkSyncMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to in-memory certs (does not throw) when persisting to disk fails', async () => {
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockReturnValue(Buffer.from('in-memory-cert'));
    mkdirSyncMock.mockImplementation(() => {
      throw new Error('EACCES');
    });
    const { loadOrGenerateCerts } = await importFresh();
    expect(loadOrGenerateCerts().cert.toString()).toBe('in-memory-cert');
  });
});

describe('DNS_DoT (DNS over TLS service)', () => {
  let server: FakeNetServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createFakeNetServer();
    createServerMock.mockReturnValue(server);
    getLocalIPMock.mockReturnValue('192.168.1.50');
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(Buffer.from('cert-or-key'));
  });

  it('constructs a TLS server requiring at least TLS 1.2, using loaded certs', async () => {
    const { DNS_DoT } = await importFresh();
    new DNS_DoT();
    expect(createServerMock).toHaveBeenCalledWith(
      expect.objectContaining({ minVersion: 'TLSv1.2', cert: expect.any(Buffer), key: expect.any(Buffer) })
    );
    expect(mockContainer.get).toHaveBeenCalledWith('StartRulesService');
  });

  it('start() connects Mongo and listens on port 853', async () => {
    const { DNS_DoT, mongoConnManager, mongoCollManager } = await importFresh();
    new DNS_DoT().start();
    await Promise.resolve();
    expect(server.listen).toHaveBeenCalledWith(853, '192.168.1.50');
    expect(mongoConnManager.connect).toHaveBeenCalledTimes(1);
    expect(mongoCollManager.initialize).toHaveBeenCalledTimes(1);
  });

  it('start()/listen()/listenError()/close() all return `this` for chaining', async () => {
    const { DNS_DoT } = await importFresh();
    const dns = new DNS_DoT();
    expect(dns.start()).toBe(dns);
    expect(dns.listen()).toBe(dns);
    expect(dns.listenError()).toBe(dns);
    expect(dns.close()).toBe(dns);
  });

  it('dispatches a length-prefixed DNS message received over "secureConnection"', async () => {
    const { DNS_DoT, rulesService } = await importFresh();
    new DNS_DoT().listen();
    const socket = createFakeNetSocket({ remoteAddress: '10.0.0.4', remotePort: 8853 });
    server.emit('secureConnection', socket);

    const dnsMsg = Buffer.from([7, 7, 7]);
    socket.emit('data', lenPrefixed(dnsMsg));
    await new Promise((r) => setImmediate(r));

    expect(rulesService.execute).toHaveBeenCalledTimes(1);
    const [passedMsg, rinfo] = rulesService.execute.mock.calls[0];
    expect(passedMsg).toEqual(dnsMsg);
    expect(rinfo).toMatchObject({ address: '10.0.0.4', port: 8853 });
  });

  it('does NOT dispatch on the plain "connection" event (only secureConnection)', async () => {
    const { DNS_DoT, rulesService } = await importFresh();
    new DNS_DoT().listen();
    const socket = createFakeNetSocket();
    server.emit('connection', socket);
    socket.emit('data', lenPrefixed(Buffer.from([1])));
    await new Promise((r) => setImmediate(r));
    expect(rulesService.execute).not.toHaveBeenCalled();
  });

  it('destroys the socket on error and registers a 30s idle timeout', async () => {
    const { DNS_DoT } = await importFresh();
    new DNS_DoT().listen();
    const socket = createFakeNetSocket();
    server.emit('secureConnection', socket);
    expect(socket.setTimeout).toHaveBeenCalledWith(30_000);
    socket.emit('error', new Error('reset'));
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('destroys the socket after the 30s idle timeout fires (RFC 7858 idle handling)', async () => {
    const { DNS_DoT } = await importFresh();
    new DNS_DoT().listen();
    const socket = createFakeNetSocket();
    server.emit('secureConnection', socket);
    socket.emit('timeout');
    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it('listenError() logs and closes the server on a server-level error', async () => {
    const { DNS_DoT } = await importFresh();
    new DNS_DoT().listenError();
    server.emit('error', new Error('EADDRINUSE'));
    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('close() closes the underlying server', async () => {
    const { DNS_DoT } = await importFresh();
    new DNS_DoT().close();
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
