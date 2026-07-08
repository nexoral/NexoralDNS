import { vi } from 'vitest';

/**
 * Minimal stand-in for a WHATWG `fetch` Response, exposing only the surface the
 * tools client actually touches: `ok`/`status`/`statusText`, `json()`/`text()`,
 * and `headers.getSetCookie()`/`headers.get()`. Anything the client reads that a
 * given test doesn't set falls back to a sensible default.
 */
export interface FakeResponseInit {
  ok?: boolean;
  status?: number;
  statusText?: string;
  /** Parsed body returned by `.json()`; pass `THROW` to simulate invalid JSON. */
  jsonBody?: unknown;
  /** Raw body returned by `.text()`. */
  textBody?: string;
  /** Values returned by `headers.getSetCookie()`. */
  setCookies?: string[];
  /** Header map consulted by `headers.get(name)` (case-insensitive). */
  headers?: Record<string, string>;
}

/** Sentinel: make `.json()` reject, exercising parseEnvelope's `.catch(() => null)`. */
export const THROW = Symbol('throw');

export function fakeResponse(init: FakeResponseInit = {}): Response {
  const status = init.status ?? (init.ok === false ? 500 : 200);
  const ok = init.ok ?? (status >= 200 && status < 300);
  const headerMap = new Map(
    Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );

  return {
    ok,
    status,
    statusText: init.statusText ?? '',
    json: vi.fn(async () => {
      if (init.jsonBody === THROW) throw new Error('invalid json');
      return init.jsonBody;
    }),
    text: vi.fn(async () => init.textBody ?? ''),
    headers: {
      getSetCookie: () => init.setCookies ?? [],
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Response;
}

/** Builds the two Set-Cookie header strings `extractTokens` parses. */
export function authCookies(accessToken: string, refreshToken: string): string[] {
  return [
    `access_token=${accessToken}; Path=/; HttpOnly`,
    `refresh_token=${refreshToken}; Path=/; HttpOnly`,
  ];
}
