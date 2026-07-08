import { describe, it, expect } from 'vitest';
import { parseEnvelope } from '@tools/source/client/types';
import { fakeResponse, THROW } from '../_testUtils/fakeHttp';

describe('parseEnvelope', () => {
  it('maps a standard {statusCode, message, data} envelope onto an ApiResult', async () => {
    const response = fakeResponse({
      ok: true,
      status: 200,
      jsonBody: { statusCode: 201, message: 'Created', data: { id: '1' } },
    });

    const result = await parseEnvelope<{ id: string }>(response);

    expect(result).toEqual({ ok: true, statusCode: 201, message: 'Created', data: { id: '1' } });
  });

  it('carries response.ok through verbatim (a 4xx envelope stays not-ok)', async () => {
    const response = fakeResponse({
      ok: false,
      status: 400,
      jsonBody: { statusCode: 400, message: 'Bad request', data: null },
    });

    const result = await parseEnvelope(response);

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.message).toBe('Bad request');
  });

  it('falls back to HTTP status/statusText when the envelope omits them', async () => {
    const response = fakeResponse({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      jsonBody: {}, // no statusCode/message/data keys
    });

    const result = await parseEnvelope(response);

    expect(result.statusCode).toBe(503);
    expect(result.message).toBe('Service Unavailable');
    expect(result.data).toBeNull();
  });

  it('falls back to null data / HTTP status when the body is not valid JSON', async () => {
    const response = fakeResponse({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      jsonBody: THROW, // .json() rejects -> caught -> null body
    });

    const result = await parseEnvelope(response);

    expect(result).toEqual({ ok: false, statusCode: 502, message: 'Bad Gateway', data: null });
  });

  it('treats a null envelope data as null (not undefined)', async () => {
    const response = fakeResponse({
      ok: true,
      status: 200,
      jsonBody: { statusCode: 200, message: 'ok', data: null },
    });

    const result = await parseEnvelope(response);

    expect(result.data).toBeNull();
  });
});
