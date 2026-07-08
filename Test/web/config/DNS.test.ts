import { describe, it, expect, vi } from 'vitest';
import { createMockContainer } from '@testUtils/mockContainer';

const { mockContainer } = vi.hoisted(() => ({ mockContainer: { get: vi.fn(), has: vi.fn(), register: vi.fn(), clear: vi.fn() } }));

vi.mock('@web/container/appContainer', () => ({ default: mockContainer }));

function chainable() {
  const obj = {
    start: vi.fn(() => obj),
    listen: vi.fn(() => obj),
    listenError: vi.fn(() => obj),
  };
  return obj;
}

async function importFresh() {
  vi.resetModules();
  const dns = chainable();
  const dnsTcp = chainable();
  const dnsDot = chainable();
  Object.assign(mockContainer, createMockContainer({ DNS: dns, DNS_TCP: dnsTcp, DNS_DoT: dnsDot }));
  const { default: handler } = await import('@web/Config/DNS');
  return { handler, dns, dnsTcp, dnsDot };
}

describe('Config/DNS handler()', () => {
  it('does not start any server merely by being imported (self-exec guard)', async () => {
    const { dns, dnsTcp, dnsDot } = await importFresh();
    expect(dns.start).not.toHaveBeenCalled();
    expect(dnsTcp.start).not.toHaveBeenCalled();
    expect(dnsDot.start).not.toHaveBeenCalled();
  });

  it('starts the UDP, TCP, and DoT servers via start().listen().listenError() chaining', async () => {
    const { handler, dns, dnsTcp, dnsDot } = await importFresh();
    await handler();
    for (const server of [dns, dnsTcp, dnsDot]) {
      expect(server.start).toHaveBeenCalledTimes(1);
      expect(server.listen).toHaveBeenCalledTimes(1);
      expect(server.listenError).toHaveBeenCalledTimes(1);
    }
    expect(mockContainer.get).toHaveBeenCalledWith('DNS');
    expect(mockContainer.get).toHaveBeenCalledWith('DNS_TCP');
    expect(mockContainer.get).toHaveBeenCalledWith('DNS_DoT');
  });
});
