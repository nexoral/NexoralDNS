import { vi } from 'vitest';

/**
 * Lightweight stand-in for the real `DIContainer` singleton exported by
 * `container/appContainer.ts`. Every production class under services/
 * imports that module-level singleton directly (`import container from
 * ".../appContainer"`), so tests mock the whole module and hand it one of
 * these instead of wiring up 17 real infra classes.
 */
export function createMockContainer(registry: Record<string, unknown> = {}) {
  const map = new Map<string, unknown>(Object.entries(registry));

  const container = {
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

  return container;
}

export type MockContainer = ReturnType<typeof createMockContainer>;
