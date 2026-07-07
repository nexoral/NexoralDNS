import { FastifyRequest } from 'fastify';

export interface ITokenExtractor {
  extract(request: FastifyRequest): string | null;
}

export class CookieHeaderTokenExtractor implements ITokenExtractor {
  extract(request: FastifyRequest): string | null {
    const cookies = (request as any).cookies;
    if (cookies?.access_token) return cookies.access_token;

    // Fall back to the Authorization header, stripping a "Bearer " scheme prefix
    // if present so the raw JWT is returned (a "Bearer <t>" value fails verify).
    const authHeader = request.headers['authorization'] as string | undefined;
    if (!authHeader) return null;
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;
  }
}
