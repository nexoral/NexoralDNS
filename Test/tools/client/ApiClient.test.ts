import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ApiClient } from '@tools/source/client/ApiClient';
import { ToolsKeys } from '@tools/source/core/key';
import type { IHealthMonitor } from '@tools/source/client/HealthMonitor';
import { fakeResponse } from '../_testUtils/fakeHttp';

const API = ToolsKeys.API_BASE_URL;
const TOKEN = 'AT';
const COOKIE = 'access_token=AT';

function envelope(data: unknown, message = 'ok', statusCode = 200) {
  return { statusCode, message, data };
}

function setup() {
  const health = {
    checkHealth: vi.fn(),
    ensureHealthy: vi.fn().mockResolvedValue(null), // healthy by default
  } satisfies IHealthMonitor & Record<string, unknown>;

  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const client = new ApiClient(health as unknown as IHealthMonitor);
  return { client, health, fetchMock };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('checkHealth / getServerInfo (unauthenticated)', () => {
  it('checkHealth delegates straight to the health monitor', async () => {
    const { client, health } = setup();
    const payload = { ok: true, statusCode: 200, message: 'ok', data: null };
    health.checkHealth.mockResolvedValue(payload);

    expect(await client.checkHealth()).toBe(payload);
  });

  it('getServerInfo hits public GET /info with no auth/health gate', async () => {
    const { client, fetchMock, health } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ version: '1' }) }));

    const result = await client.getServerInfo();

    expect(fetchMock).toHaveBeenCalledWith(`${API}/info`);
    expect(health.ensureHealthy).not.toHaveBeenCalled();
    expect(result.data).toEqual({ version: '1' });
  });
});

describe('request — gating', () => {
  it('returns 503 (and does not fetch) when the health gate reports an issue', async () => {
    const { client, health, fetchMock } = setup();
    health.ensureHealthy.mockResolvedValue('unhealthy');

    const result = await client.request(TOKEN, '/domains/all-domains');

    expect(result).toEqual({ ok: false, statusCode: 503, message: 'unhealthy', data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('request — happy path & body shaping', () => {
  it('replays the OAuth access token as the access_token cookie on a bodyless GET', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope([{ id: 1 }]) }));

    const result = await client.request(TOKEN, '/domains/all-domains');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/domains/all-domains`, {
      method: 'GET',
      headers: { Cookie: COOKIE },
      body: undefined,
    });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('adds Content-Type and a JSON body only when a body is provided', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ created: true }) }));

    await client.request(TOKEN, '/dns/create-dns', { method: 'POST', body: { name: 'a' } });

    expect(fetchMock).toHaveBeenCalledWith(`${API}/dns/create-dns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({ name: 'a' }),
    });
  });

  it('carries a per-call token, so two callers never share one session', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope(null) }));

    await client.request('alice-token', '/service-info');
    await client.request('bob-token', '/service-info');

    expect(fetchMock.mock.calls[0][1].headers.Cookie).toBe('access_token=alice-token');
    expect(fetchMock.mock.calls[1][1].headers.Cookie).toBe('access_token=bob-token');
  });
});

describe('request — 401 handling', () => {
  it('surfaces a 401 without retrying — refresh is the MCP client\'s job via the OAuth grant', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401, jsonBody: envelope(null, 'Unauthorized', 401) }));

    const result = await client.request(TOKEN, '/service-info');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(401);
  });
});

describe('downloadLogExport', () => {
  it('returns a typed error when the health gate is closed', async () => {
    const { client, health } = setup();
    health.ensureHealthy.mockResolvedValue('down');

    const result = await client.downloadLogExport(TOKEN);

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(503);
  });

  it('parses the JSON envelope on an error response instead of returning raw text', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 404, headers: { 'content-type': 'application/json' }, jsonBody: envelope(null, 'No export', 404) }),
    );

    const result = await client.downloadLogExport(TOKEN);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('No export');
  });

  it('returns the raw text body on a successful text/plain download', async () => {
    const { client, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, headers: { 'content-type': 'text/plain' }, textBody: 'log line 1\nlog line 2' }));

    const result = await client.downloadLogExport(TOKEN);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('log line 1\nlog line 2');
    expect(result.message).toContain('Export downloaded');
  });

  it('truncates an oversized export to the 200k-char cap', async () => {
    const { client, fetchMock } = setup();
    const huge = 'a'.repeat(200_001);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, headers: { 'content-type': 'text/plain' }, textBody: huge }));

    const result = await client.downloadLogExport(TOKEN);

    expect(result.data?.length).toBe(200_000);
    expect(result.message).toContain('truncated to 200000 characters');
  });
});
