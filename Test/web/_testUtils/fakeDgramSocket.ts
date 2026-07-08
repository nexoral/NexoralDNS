import { EventEmitter } from 'node:events';
import { vi } from 'vitest';
import type { AddressInfo } from 'node:net';

/**
 * Minimal fake of `dgram.Socket` covering every member the codebase touches
 * (send/bind/close/address/setRecvBufferSize/setSendBufferSize/unref) while
 * staying a real EventEmitter so `.on('message'|'listening'|'error', ...)`
 * behaves exactly like the Node socket it replaces.
 */
export class FakeDgramSocket extends EventEmitter {
  public bound = false;
  private boundAddress: AddressInfo | null = null;

  send = vi.fn(
    (
      _msg: Buffer,
      _port?: number,
      _address?: string,
      cb?: (error: Error | null) => void
    ) => {
      cb?.(null);
    }
  );

  bind = vi.fn((port?: number, address?: string, cb?: () => void) => {
    this.bound = true;
    this.boundAddress = { address: address ?? '0.0.0.0', port: port ?? 0, family: 'IPv4' };
    queueMicrotask(() => {
      // A synchronous close() between bind() and this microtask firing means
      // there's nothing to announce anymore (mirrors real dgram semantics
      // where a closed socket never fires 'listening').
      if (!this.bound) return;
      this.emit('listening');
      cb?.();
    });
    return this;
  });

  close = vi.fn((cb?: () => void) => {
    this.bound = false;
    this.boundAddress = null;
    cb?.();
    return this;
  });

  address = vi.fn((): AddressInfo => {
    if (!this.bound || !this.boundAddress) {
      throw new Error('EBADF: bad file descriptor, address');
    }
    return this.boundAddress;
  });

  setRecvBufferSize = vi.fn();
  getRecvBufferSize = vi.fn(() => 4 * 1024 * 1024);
  setSendBufferSize = vi.fn();
  getSendBufferSize = vi.fn(() => 4 * 1024 * 1024);
  unref = vi.fn(() => this);
  ref = vi.fn(() => this);

  /** Test helper: simulate the socket becoming bound without going through bind(). */
  simulateBound(address: string, port = 53): void {
    this.bound = true;
    this.boundAddress = { address, port, family: 'IPv4' };
  }

  /** Test helper: simulate an inbound UDP datagram. */
  simulateMessage(msg: Buffer, rinfo: { address: string; port: number; family?: 'IPv4' | 'IPv6'; size?: number }): void {
    this.emit('message', msg, { family: 'IPv4', size: msg.length, ...rinfo });
  }
}

export function createFakeDgramSocket(): FakeDgramSocket {
  return new FakeDgramSocket();
}
