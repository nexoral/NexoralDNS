import { vi } from 'vitest';
import type { FastifyReply } from 'fastify';

export interface CapturedCookie {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

export interface FakeReply {
  reply: FastifyReply;
  /** HTTP status passed to `.status()` (last wins). */
  statusCode: number | undefined;
  /** Body passed to `.send()`. */
  body: unknown;
  /** Whether `.send()` was called. */
  sent: boolean;
  /** Cookies set via `.setCookie()` / `.clearCookie()`. */
  cookies: CapturedCookie[];
  cleared: string[];
}

/**
 * Minimal Fastify reply double covering exactly what the server's `ResponseSender`
 * and cookie-setting paths use: chainable `.status()`, `.send()`, plus
 * `.setCookie()` / `.clearCookie()`. Reading the returned object's fields lets a
 * test assert the HTTP status, response envelope and any cookies in one place.
 */
export function createFakeReply(): FakeReply {
  const state: FakeReply = {
    statusCode: undefined,
    body: undefined,
    sent: false,
    cookies: [],
    cleared: [],
  } as FakeReply;

  const reply = {
    status: vi.fn((code: number) => {
      state.statusCode = code;
      return reply;
    }),
    code: vi.fn((code: number) => {
      state.statusCode = code;
      return reply;
    }),
    send: vi.fn((payload: unknown) => {
      state.body = payload;
      state.sent = true;
      return reply;
    }),
    setCookie: vi.fn((name: string, value: string, options: Record<string, unknown> = {}) => {
      state.cookies.push({ name, value, options });
      return reply;
    }),
    clearCookie: vi.fn((name: string) => {
      state.cleared.push(name);
      return reply;
    }),
  };

  state.reply = reply as unknown as FastifyReply;
  return state;
}
