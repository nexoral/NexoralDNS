import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

/**
 * Minimal fake of `net.Socket` / `tls.TLSSocket` covering the members used by
 * TCPInputOutputHandler and the TCP/DoT server `listen()` handlers.
 */
export class FakeNetSocket extends EventEmitter {
  public destroyed = false;
  public remoteAddress: string | undefined = '10.0.0.5';
  public remoteFamily: string | undefined = 'IPv4';
  public remotePort: number | undefined = 54321;
  public written: Buffer[] = [];

  write = vi.fn((data: Buffer) => {
    if (this.destroyed) return false;
    this.written.push(Buffer.from(data));
    return true;
  });

  destroy = vi.fn(() => {
    this.destroyed = true;
    this.emit('close');
    return this;
  });

  setTimeout = vi.fn((_ms: number, cb?: () => void) => {
    if (cb) this.on('timeout', cb);
    return this;
  });

  end = vi.fn(() => this);

  /** Test helper: concatenate everything written so far. */
  allWritten(): Buffer {
    return Buffer.concat(this.written);
  }
}

export function createFakeNetSocket(
  overrides: Partial<Pick<FakeNetSocket, 'remoteAddress' | 'remoteFamily' | 'remotePort' | 'destroyed'>> = {}
): FakeNetSocket {
  const socket = new FakeNetSocket();
  Object.assign(socket, overrides);
  return socket;
}
