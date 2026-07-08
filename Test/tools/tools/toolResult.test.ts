import { describe, it, expect } from 'vitest';
import { textResult, requireSessionId, fromApiResult, buildQuery } from '@tools/source/tools/toolResult';
import type { ApiResult } from '@tools/source/client/types';

describe('textResult', () => {
  it('wraps text in a single text content block, not an error by default', () => {
    expect(textResult('hello')).toEqual({ content: [{ type: 'text', text: 'hello' }], isError: false });
  });

  it('flags an error result when isError is true', () => {
    expect(textResult('boom', true)).toEqual({ content: [{ type: 'text', text: 'boom' }], isError: true });
  });
});

describe('requireSessionId', () => {
  it('returns the session id when present', () => {
    expect(requireSessionId({ sessionId: 'abc' } as any)).toBe('abc');
  });

  it('throws when the transport supplied no session id (stateful-mode invariant)', () => {
    expect(() => requireSessionId({} as any)).toThrowError(/not running in stateful mode/);
  });
});

describe('fromApiResult', () => {
  it('renders a success result as pretty-printed JSON of message + data', () => {
    const result: ApiResult<{ id: number }> = { ok: true, statusCode: 200, message: 'Fetched', data: { id: 7 } };

    const out = fromApiResult(result);

    expect(out.isError).toBe(false);
    expect(JSON.parse((out.content[0] as { text: string }).text)).toEqual({ message: 'Fetched', data: { id: 7 } });
  });

  it('renders a failed result as an "Error (status): message" error block', () => {
    const result: ApiResult = { ok: false, statusCode: 404, message: 'Not found', data: null };

    const out = fromApiResult(result);

    expect(out.isError).toBe(true);
    expect((out.content[0] as { text: string }).text).toBe('Error (404): Not found');
  });
});

describe('buildQuery', () => {
  it('returns an empty string when no params are given', () => {
    expect(buildQuery({})).toBe('');
  });

  it('returns an empty string when every param is undefined', () => {
    expect(buildQuery({ skip: undefined, limit: undefined })).toBe('');
  });

  it('skips undefined values but keeps falsy 0 / false', () => {
    expect(buildQuery({ skip: 0, limit: undefined, active: false })).toBe('?skip=0&active=false');
  });

  it('stringifies numbers and booleans and URL-encodes values', () => {
    expect(buildQuery({ q: 'a b&c', page: 2, on: true })).toBe('?q=a+b%26c&page=2&on=true');
  });
});
