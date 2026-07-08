import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dgram from 'node:dgram';

vi.mock('node:dgram', () => ({
  default: {
    createSocket: vi.fn(() => ({ __fake: true })),
  },
}));

const originalVersions = process.versions;

function setNodeVersion(version: string) {
  Object.defineProperty(process, 'versions', {
    value: { ...originalVersions, node: version },
    configurable: true,
  });
}

describe('createDnsListenerSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'versions', { value: originalVersions, configurable: true });
  });

  it('enables reusePort on Node >= 23.1.0', async () => {
    setNodeVersion('23.1.0');
    vi.resetModules();
    const { createDnsListenerSocket } = await import('@web/utilities/dnsSocket.utls');
    createDnsListenerSocket();
    expect(dgram.createSocket).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true, reusePort: true });
  });

  it('enables reusePort on Node > 23 (e.g. 24.0.0)', async () => {
    setNodeVersion('24.0.0');
    vi.resetModules();
    const { createDnsListenerSocket } = await import('@web/utilities/dnsSocket.utls');
    createDnsListenerSocket();
    expect(dgram.createSocket).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true, reusePort: true });
  });

  it('omits reusePort on Node 23.0.x (below the .1 patch)', async () => {
    setNodeVersion('23.0.5');
    vi.resetModules();
    const { createDnsListenerSocket } = await import('@web/utilities/dnsSocket.utls');
    createDnsListenerSocket();
    expect(dgram.createSocket).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true });
  });

  it('omits reusePort on Node < 23', async () => {
    setNodeVersion('20.11.0');
    vi.resetModules();
    const { createDnsListenerSocket } = await import('@web/utilities/dnsSocket.utls');
    createDnsListenerSocket();
    expect(dgram.createSocket).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true });
  });

  it('returns whatever dgram.createSocket returns', async () => {
    setNodeVersion('20.11.0');
    vi.resetModules();
    const dgramMock = (await import('node:dgram')).default;
    const fakeSocket = { __fake: true, marker: 'socket-1' };
    (dgramMock.createSocket as ReturnType<typeof vi.fn>).mockReturnValue(fakeSocket);
    const { createDnsListenerSocket } = await import('@web/utilities/dnsSocket.utls');
    expect(createDnsListenerSocket()).toBe(fakeSocket);
  });
});
