import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

/**
 * Fake of a `redis` v4/v5 `RedisClientType` — extends EventEmitter so
 * `.on('connect'|'ready'|'error'|'reconnecting'|'end', ...)` works exactly
 * like the real client used by RedisConnectionManager's setupEventHandlers.
 */
export class FakeRedisClient extends EventEmitter {
  public isOpen = false;

  connect = vi.fn(async () => {
    this.isOpen = true;
    return this;
  });
  quit = vi.fn(async () => {
    this.isOpen = false;
  });
  disconnect = vi.fn(async () => {
    this.isOpen = false;
  });

  setEx = vi.fn().mockResolvedValue('OK');
  get = vi.fn().mockResolvedValue(null);
  del = vi.fn().mockResolvedValue(0);
  exists = vi.fn().mockResolvedValue(0);
  scan = vi.fn().mockResolvedValue({ cursor: '0', keys: [] });
  ttl = vi.fn().mockResolvedValue(-2);
  expire = vi.fn().mockResolvedValue(1);
  flushAll = vi.fn().mockResolvedValue('OK');
  info = vi.fn().mockResolvedValue('');
  sMembers = vi.fn().mockResolvedValue([]);
  sIsMember = vi.fn().mockResolvedValue(false);
  publish = vi.fn().mockResolvedValue(0);
  subscribe = vi.fn().mockResolvedValue(undefined);
}

export function createFakeRedisClient(): FakeRedisClient {
  return new FakeRedisClient();
}
