import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import { createFakeDgramSocket } from '@testUtils/fakeDgramSocket';

const { retrySecondsMock, createDnsListenerSocketMock } = vi.hoisted(() => ({
  retrySecondsMock: vi.fn(),
  createDnsListenerSocketMock: vi.fn(),
}));

vi.mock('outers', () => ({ Retry: { Seconds: retrySecondsMock } }));
vi.mock('@web/utilities/dnsSocket.utls', () => ({ createDnsListenerSocket: createDnsListenerSocketMock }));
vi.mock('@web/utilities/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

function iface(address: string, internal = false) {
  return { address, family: 'IPv4' as const, internal, netmask: '', mac: '', cidr: null } as os.NetworkInterfaceInfo;
}

async function importFresh() {
  vi.resetModules();
  const { default: IP_SCAN } = await import('@web/utilities/AutoIP_SCAN.utls');
  return IP_SCAN;
}

describe('IP_SCAN.getCurrentIP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first non-internal IPv4 address', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const IP_SCAN = await importFresh();
    const scanner = new IP_SCAN('10.0.0.5', createFakeDgramSocket() as unknown as import('node:dgram').Socket);
    expect(await scanner.getCurrentIP()).toBe('10.0.0.5');
  });

  it('skips internal/loopback interfaces', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ lo: [iface('127.0.0.1', true)], eth0: [iface('10.0.0.5')] });
    const IP_SCAN = await importFresh();
    const scanner = new IP_SCAN('10.0.0.5', createFakeDgramSocket() as unknown as import('node:dgram').Socket);
    expect(await scanner.getCurrentIP()).toBe('10.0.0.5');
  });

  it('falls back to "0.0.0.0" when no usable interface exists', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({});
    const IP_SCAN = await importFresh();
    const scanner = new IP_SCAN('10.0.0.5', createFakeDgramSocket() as unknown as import('node:dgram').Socket);
    expect(await scanner.getCurrentIP()).toBe('0.0.0.0');
  });
});

describe('IP_SCAN.scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('registers a 10-second recurring, immediate-fire retry', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const IP_SCAN = await importFresh();
    await new IP_SCAN('10.0.0.5', createFakeDgramSocket() as unknown as import('node:dgram').Socket).scan();
    expect(retrySecondsMock).toHaveBeenCalledWith(expect.any(Function), 10, true);
  });

  it('does nothing when the detected IP has not changed', async () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const originalSocket = createFakeDgramSocket();
    const IP_SCAN = await importFresh();
    await new IP_SCAN('10.0.0.5', originalSocket as unknown as import('node:dgram').Socket).scan();
    const tick = retrySecondsMock.mock.calls[0][0] as () => Promise<void>;
    await tick();
    expect(originalSocket.close).not.toHaveBeenCalled();
    expect(createDnsListenerSocketMock).not.toHaveBeenCalled();
  });

  it('rebinds to a new socket when the detected IP changes, and invokes onRebind once listening', async () => {
    const networkInterfacesSpy = vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const originalSocket = createFakeDgramSocket();
    const newSocket = createFakeDgramSocket();
    createDnsListenerSocketMock.mockReturnValue(newSocket);
    const onRebind = vi.fn();

    const IP_SCAN = await importFresh();
    await new IP_SCAN('10.0.0.5', originalSocket as unknown as import('node:dgram').Socket, onRebind).scan();
    const tick = retrySecondsMock.mock.calls[0][0] as () => Promise<void>;

    networkInterfacesSpy.mockReturnValue({ eth0: [iface('10.0.0.99')] });
    await tick();

    expect(originalSocket.close).toHaveBeenCalledTimes(1);
    expect(createDnsListenerSocketMock).toHaveBeenCalledTimes(1);
    expect(newSocket.bind).toHaveBeenCalledWith(53, '10.0.0.99');

    await new Promise((r) => setImmediate(r)); // let the 'listening' microtask fire
    expect(onRebind).toHaveBeenCalledWith(newSocket);
  });

  it('resets to allow a retry and closes the new socket when the rebind fails', async () => {
    const networkInterfacesSpy = vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const originalSocket = createFakeDgramSocket();
    const newSocket = createFakeDgramSocket();
    createDnsListenerSocketMock.mockReturnValue(newSocket);
    const onRebind = vi.fn();

    const IP_SCAN = await importFresh();
    await new IP_SCAN('10.0.0.5', originalSocket as unknown as import('node:dgram').Socket, onRebind).scan();
    const tick = retrySecondsMock.mock.calls[0][0] as () => Promise<void>;

    networkInterfacesSpy.mockReturnValue({ eth0: [iface('10.0.0.99')] });
    // Not fully awaiting tick(): bind()'s 'listening' event fires on a queued
    // microtask, and a real socket only ever fires 'listening' OR 'error'. One
    // microtask hop lets the synchronous close()->bind() chain run and schedule
    // (but not yet fire) 'listening', so we can inject 'error' first.
    const tickPromise = tick();
    await Promise.resolve();
    newSocket.emit('error', new Error('EADDRNOTAVAIL'));
    await tickPromise;

    expect(onRebind).not.toHaveBeenCalled();
    expect(newSocket.close).toHaveBeenCalledTimes(1);

    // PREVIOUS_IP was reset to "" — the next tick retries the rebind.
    const secondNewSocket = createFakeDgramSocket();
    createDnsListenerSocketMock.mockReturnValue(secondNewSocket);
    await tick();
    expect(createDnsListenerSocketMock).toHaveBeenCalledTimes(2);
  });

  it('does not invoke onRebind when none was provided and the rebind succeeds', async () => {
    const networkInterfacesSpy = vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    const originalSocket = createFakeDgramSocket();
    const newSocket = createFakeDgramSocket();
    createDnsListenerSocketMock.mockReturnValue(newSocket);

    const IP_SCAN = await importFresh();
    await new IP_SCAN('10.0.0.5', originalSocket as unknown as import('node:dgram').Socket).scan();
    const tick = retrySecondsMock.mock.calls[0][0] as () => Promise<void>;

    networkInterfacesSpy.mockReturnValue({ eth0: [iface('10.0.0.99')] });
    await expect(tick()).resolves.toBeUndefined();
    await new Promise((r) => setImmediate(r));
  });
});
