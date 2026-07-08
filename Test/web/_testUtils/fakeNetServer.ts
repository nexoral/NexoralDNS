import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
import type { AddressInfo } from 'node:net';

/**
 * Shared fake for `net.Server` / `tls.Server` — both DNS_TCP.Service and
 * DNS_DoT.Service only ever call listen()/close()/address()/on(), and both
 * accept connections via an event ("connection" vs "secureConnection").
 */
export class FakeNetServer extends EventEmitter {
  private bound = false;
  private boundAddress: AddressInfo | null = null;

  listen = vi.fn((port?: number, address?: string, cb?: () => void) => {
    this.bound = true;
    this.boundAddress = { address: address ?? '0.0.0.0', port: port ?? 0, family: 'IPv4' };
    queueMicrotask(() => {
      // A synchronous close() between listen() and this microtask firing means
      // there's nothing to announce anymore.
      if (!this.bound) return;
      this.emit('listening');
      cb?.();
    });
    return this;
  });

  close = vi.fn((cb?: () => void) => {
    this.bound = false;
    cb?.();
    return this;
  });

  address = vi.fn((): AddressInfo | null => (this.bound ? this.boundAddress : null));
}

export function createFakeNetServer(): FakeNetServer {
  return new FakeNetServer();
}
