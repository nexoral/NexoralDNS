import { FastifyRequest } from 'fastify';

export interface ITokenExtractor {
  extract(request: FastifyRequest): string | null;
}

export class CookieHeaderTokenExtractor implements ITokenExtractor {
  extract(request: FastifyRequest): string | null {
    const cookies = (request as any).cookies;
    return cookies?.access_token || (request.headers['authorization'] as string | undefined) || null;
  }
}
