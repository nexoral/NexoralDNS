import { describe, it, expect, vi } from 'vitest';
import { DIContainer } from '@web/container/DIContainer';

describe('DIContainer', () => {
  it('returns a new instance from the factory for a non-singleton registration', () => {
    const container = new DIContainer();
    let counter = 0;
    container.register('Widget', () => ({ id: ++counter }));

    const a = container.get<{ id: number }>('Widget');
    const b = container.get<{ id: number }>('Widget');

    expect(a).not.toBe(b);
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  it('memoizes a singleton: the factory runs exactly once', () => {
    const factory = vi.fn(() => ({ value: 42 }));
    const container = new DIContainer();
    container.register('Config', factory, true);

    const a = container.get('Config');
    const b = container.get('Config');

    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('defaults singleton=false when the third argument is omitted', () => {
    const factory = vi.fn(() => ({}));
    const container = new DIContainer();
    container.register('Thing', factory);

    container.get('Thing');
    container.get('Thing');

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('throws a descriptive error when getting an unregistered key', () => {
    const container = new DIContainer();
    expect(() => container.get('Missing')).toThrow("Service 'Missing' not registered in DI container");
  });

  it('has() reflects registration state', () => {
    const container = new DIContainer();
    expect(container.has('X')).toBe(false);
    container.register('X', () => 1);
    expect(container.has('X')).toBe(true);
  });

  it('clear() wipes both singleton instances and factories', () => {
    const factory = vi.fn(() => ({}));
    const container = new DIContainer();
    container.register('Y', factory, true);
    container.get('Y');

    container.clear();

    expect(container.has('Y')).toBe(false);
    expect(() => container.get('Y')).toThrow("Service 'Y' not registered in DI container");
  });

  it('allows dependent factories to resolve each other via container.get inside the factory', () => {
    const container = new DIContainer();
    container.register('Base', () => ({ name: 'base' }), true);
    container.register('Derived', () => ({ base: container.get('Base') }), true);

    const derived = container.get<{ base: { name: string } }>('Derived');
    expect(derived.base.name).toBe('base');
  });
});
