import type { FastifyRequest } from 'fastify';

export interface FakeRequestInit {
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  /** Populated by authGuard on success; controllers read `request.user`. */
  user?: Record<string, unknown>;
}

/**
 * Builds a Fastify request double carrying only the fields the server's
 * controllers/middlewares actually read (`body`, `params`, `query`, `headers`,
 * `cookies`, `user`). Cast to `FastifyRequest` for the call site.
 */
export function createFakeRequest(init: FakeRequestInit = {}): FastifyRequest {
  return {
    body: init.body,
    params: init.params ?? {},
    query: init.query ?? {},
    headers: init.headers ?? {},
    cookies: init.cookies ?? {},
    user: init.user,
  } as unknown as FastifyRequest;
}
