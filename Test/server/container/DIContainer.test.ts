import { describe, it, expect, vi } from 'vitest';
import { DIContainer } from '@server/source/container/DIContainer';

describe('DIContainer', () => {
  it('registers and resolves a transient factory (new instance each get)', () => {
    const c = new DIContainer();
    c.register('T', () => ({ n: Math.random() }));
    expect(c.get('T')).not.toBe(c.get('T'));
  });

  it('caches a singleton (same instance every get) and builds it lazily', () => {
    const c = new DIContainer();
    const factory = vi.fn(() => ({}));
    c.register('S', factory, true);

    expect(factory).not.toHaveBeenCalled(); // lazy
    const a = c.get('S');
    const b = c.get('S');
    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('passes per-call args to a transient factory', () => {
    const c = new DIContainer();
    c.register('T', (x: number, y: number) => x + y);
    expect(c.get('T', 2, 3)).toBe(5);
  });

  it('throws when per-call args are passed to a singleton', () => {
    const c = new DIContainer();
    c.register('S', () => ({}), true);
    expect(() => c.get('S', 'arg')).toThrowError(/singleton/);
  });

  it('throws when resolving an unregistered key', () => {
    expect(() => new DIContainer().get('missing')).toThrowError(/not registered/);
  });

  it('has() reflects registration state', () => {
    const c = new DIContainer();
    expect(c.has('X')).toBe(false);
    c.register('X', () => 1);
    expect(c.has('X')).toBe(true);
  });

  it('clear() removes all registrations and cached singletons', () => {
    const c = new DIContainer();
    c.register('S', () => ({}), true);
    c.get('S');
    c.clear();
    expect(c.has('S')).toBe(false);
    expect(() => c.get('S')).toThrowError(/not registered/);
  });
});
