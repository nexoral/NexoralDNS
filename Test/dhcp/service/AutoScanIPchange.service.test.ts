import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NetworkInterfaceInfo } from 'os';

/**
 * AutoScanIPchange.service.ts — IP_SCAN class
 *
 * Responsibilities:
 *  - getCurrentIP(): reads os.networkInterfaces(), returns first non-internal IPv4
 *  - isUsableIPv4(): rejects empty, 0.0.0.0, malformed addresses
 *  - scan(): polls via Retry.Seconds, publishes on IP change, updates resolv.conf
 *
 * We mock `os` for deterministic network interface results and `nexoraldns-shared`
 * to capture the polling callback without real timers.
 */

// Hoisted mocks — available before any module evaluation
const { mockRetrySeconds } = vi.hoisted(() => {
  const mockRetrySeconds = vi.fn();
  return { mockRetrySeconds };
});

// Mock shared Retry
vi.mock('nexoraldns-shared', () => ({
  Retry: { Seconds: mockRetrySeconds },
}));

function makeInterface(address: string, family: 'IPv4' | 'IPv6', internal: boolean): NetworkInterfaceInfo {
  return { address, family, internal, mac: '00:00:00:00:00:00', netmask: '255.255.255.0', cidr: `${address}/24` } as NetworkInterfaceInfo;
}

describe('IP_SCAN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRetrySeconds.mockImplementation(async (fn: () => Promise<void>) => {
      await fn();
      return () => {};
    });
  });

  async function importWithOsMock(osMock: () => Record<string, unknown>) {
    vi.doMock('os', osMock);
    return import('@dhcp/src/service/AutoScanIPchange.service');
  }

  describe('getCurrentIP', () => {
    it('returns the first non-internal IPv4 address', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            lo: [makeInterface('127.0.0.1', 'IPv4', true)],
            eth0: [
              makeInterface('192.168.1.100', 'IPv4', false),
              makeInterface('fe80::1', 'IPv6', false),
            ],
          }),
        },
      }));
      const scanner = new IP_SCAN(vi.fn());
      expect(await scanner.getCurrentIP()).toBe('192.168.1.100');
    });

    it('returns 0.0.0.0 when no non-internal IPv4 exists', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            lo: [makeInterface('127.0.0.1', 'IPv4', true)],
          }),
        },
      }));
      const scanner = new IP_SCAN(vi.fn());
      expect(await scanner.getCurrentIP()).toBe('0.0.0.0');
    });

    it('skips IPv6 addresses and returns the IPv4 one', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            eth0: [
              makeInterface('fe80::1', 'IPv6', false),
              makeInterface('10.0.0.5', 'IPv4', false),
            ],
          }),
        },
      }));
      const scanner = new IP_SCAN(vi.fn());
      expect(await scanner.getCurrentIP()).toBe('10.0.0.5');
    });

    it('handles undefined network interface entries gracefully', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            eth0: undefined,
            wlan0: [makeInterface('192.168.0.10', 'IPv4', false)],
          }),
        },
      }));
      const scanner = new IP_SCAN(vi.fn());
      expect(await scanner.getCurrentIP()).toBe('192.168.0.10');
    });
  });

  describe('scan — IP change detection', () => {
    it('does not publish when IP has not changed', async () => {
      mockRetrySeconds.mockImplementation(async (fn: () => Promise<void>) => {
        await fn();
        await fn();
        return () => {};
      });

      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            eth0: [makeInterface('192.168.1.50', 'IPv4', false)],
          }),
        },
      }));

      const publishFn = vi.fn().mockResolvedValue(undefined);
      const scanner = new IP_SCAN(publishFn);

      await scanner.scan();

      expect(publishFn).toHaveBeenCalledTimes(1);
    });

    it('skips publishing for unusable IPs (0.0.0.0)', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({
            lo: [makeInterface('127.0.0.1', 'IPv4', true)],
          }),
        },
      }));

      const publishFn = vi.fn().mockResolvedValue(undefined);
      const scanner = new IP_SCAN(publishFn);

      await scanner.scan();

      expect(publishFn).not.toHaveBeenCalled();
    });

  });

  describe('isUsableIPv4 (via getCurrentIP integration)', () => {
    it('rejects empty string interfaces', async () => {
      const { default: IP_SCAN } = await importWithOsMock(() => ({
        default: {
          networkInterfaces: () => ({}),
        },
      }));

      const publishFn = vi.fn();
      const scanner = new IP_SCAN(publishFn);

      await scanner.scan();

      expect(publishFn).not.toHaveBeenCalled();
    });
  });
});
