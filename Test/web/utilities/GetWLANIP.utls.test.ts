import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import getLocalIP from '@web/utilities/GetWLANIP.utls';

function iface(address: string, family: 'IPv4' | 'IPv6' = 'IPv4', internal = false) {
  return { address, family, internal, netmask: '', mac: '', cidr: null } as os.NetworkInterfaceInfo;
}

describe('getLocalIP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('picks the wlan interface when preferred="wifi"', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0: [iface('10.0.0.5')],
      wlan0: [iface('192.168.1.20')],
    });
    expect(getLocalIP('wifi')).toBe('192.168.1.20');
  });

  it('matches "Wi-Fi" (case-insensitive) interface names for preferred="wifi"', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ 'Wi-Fi': [iface('192.168.50.7')] });
    expect(getLocalIP('wifi')).toBe('192.168.50.7');
  });

  it('falls back to the first available IPv4 when preferred="wifi" but no wlan interface exists', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    expect(getLocalIP('wifi')).toBe('10.0.0.5');
  });

  it('picks the eth/enp interface when preferred="lan"', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      wlan0: [iface('192.168.1.20')],
      enp0s3: [iface('10.0.0.9')],
    });
    expect(getLocalIP('lan')).toBe('10.0.0.9');
  });

  it('matches "eth" prefix interfaces for preferred="lan"', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth1: [iface('10.1.1.1')] });
    expect(getLocalIP('lan')).toBe('10.1.1.1');
  });

  it('returns the first available non-internal IPv4 for preferred="any"', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ docker0: [iface('172.17.0.1')] });
    expect(getLocalIP('any')).toBe('172.17.0.1');
  });

  it('defaults to preferred="any" when no argument is given', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('10.0.0.5')] });
    expect(getLocalIP()).toBe('10.0.0.5');
  });

  it('skips internal (loopback) interfaces', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      lo: [iface('127.0.0.1', 'IPv4', true)],
      eth0: [iface('10.0.0.5')],
    });
    expect(getLocalIP('any')).toBe('10.0.0.5');
  });

  it('skips IPv6-only entries', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({ eth0: [iface('fe80::1', 'IPv6')] });
    expect(getLocalIP('any')).toBe('127.0.0.1');
  });

  it('falls back to 127.0.0.1 when no usable interface exists at all', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({});
    expect(getLocalIP('any')).toBe('127.0.0.1');
  });

  it('tolerates an interface entry that is undefined', () => {
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      ghost: undefined,
      eth0: [iface('10.0.0.5')],
    } as unknown as ReturnType<typeof os.networkInterfaces>);
    expect(getLocalIP('any')).toBe('10.0.0.5');
  });
});
