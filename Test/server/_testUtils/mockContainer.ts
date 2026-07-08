import { vi } from 'vitest';

/**
 * Lightweight stand-in for the real `DIContainer` singleton exported by
 * `container/appContainer.ts`. Every controller/service/middleware imports that
 * module-level singleton directly (`import container from ".../appContainer"`),
 * so tests `vi.mock('@server/container/appContainer')` and return one of these
 * pre-seeded with just the fakes the code under test resolves — instead of
 * wiring up the ~30 real infra/service classes.
 */
export function createMockContainer(registry: Record<string, unknown> = {}) {
  const map = new Map<string, unknown>(Object.entries(registry));

  return {
    get: vi.fn((key: string) => {
      if (!map.has(key)) {
        throw new Error(`Service '${key}' not registered in DI container`);
      }
      return map.get(key);
    }),
    has: vi.fn((key: string) => map.has(key)),
    register: vi.fn((key: string, factory: () => unknown) => {
      map.set(key, factory());
    }),
    clear: vi.fn(() => map.clear()),
    /** Test helper: register/replace an entry after construction. */
    __set(key: string, value: unknown) {
      map.set(key, value);
    },
  };
}

export type MockContainer = ReturnType<typeof createMockContainer>;
