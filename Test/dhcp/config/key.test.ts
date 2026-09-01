import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * key.ts exports REDIS_URI which reads from process.env.REDIS_URI with a
 * localhost fallback. We test each branch by manipulating the env var.
 */

describe('REDIS_URI', () => {
  const originalEnv = process.env.REDIS_URI;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.REDIS_URI;
    } else {
      process.env.REDIS_URI = originalEnv;
    }
  });

  it('returns the env value when REDIS_URI is set', async () => {
    process.env.REDIS_URI = 'redis://custom-host:6380';
    const { REDIS_URI } = await import('@dhcp/src/config/key');
    expect(REDIS_URI).toBe('redis://custom-host:6380');
  });

  it('falls back to localhost:6379 when REDIS_URI is unset', async () => {
    delete process.env.REDIS_URI;
    const { REDIS_URI } = await import('@dhcp/src/config/key');
    expect(REDIS_URI).toBe('redis://localhost:6379');
  });
});
