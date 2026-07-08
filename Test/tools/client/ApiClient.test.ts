import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Neutralise the on-disk session singleton: importing ApiClient constructs its
// default export `new ApiClient(new HealthMonitor(), sessionStoreSingleton)`,
// and the real store reads $HOME/.nexoraldns at construction. We test the
// exported CLASS with injected fakes, so the singleton's store just needs to be
// inert — mock the module so no filesystem is touched on import.
vi.mock('@tools/source/session/McpSessionStore', () => ({ default: {} }));

import { ApiClient } from '@tools/source/client/ApiClient';
import { ToolsKeys } from '@tools/source/core/key';
import type { IHealthMonitor } from '@tools/source/client/HealthMonitor';
import type { ISessionStore, McpUserSession } from '@tools/source/session/McpSessionStore';
import { fakeResponse, authCookies } from '../_testUtils/fakeHttp';

const API = ToolsKeys.API_BASE_URL;
const SID = 'mcp-1';
const SESSION: McpUserSession = { username: 'alice', accessToken: 'AT', refreshToken: 'RT' };
const COOKIE = 'access_token=AT; refresh_token=RT';

function envelope(data: unknown, message = 'ok', statusCode = 200) {
  return { statusCode, message, data };
}

function setup() {
  const health = {
    checkHealth: vi.fn(),
    ensureHealthy: vi.fn().mockResolvedValue(null), // healthy by default
  } satisfies IHealthMonitor & Record<string, unknown>;

  const store = {
    get: vi.fn<(id: string) => McpUserSession | undefined>(),
    set: vi.fn(),
    updateTokens: vi.fn(),
    getCredentials: vi.fn(),
    clear: vi.fn(),
  } satisfies ISessionStore & Record<string, unknown>;

  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const client = new ApiClient(health as unknown as IHealthMonitor, store as unknown as ISessionStore);
  return { client, health, store, fetchMock };
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

describe('login', () => {
  it('is blocked (503) by the health gate and never calls the login endpoint', async () => {
    const { client, health, fetchMock } = setup();
    health.ensureHealthy.mockResolvedValue('server down');

    const result = await client.login(SID, 'alice', 'pw');

    expect(result).toEqual({ ok: false, statusCode: 503, message: 'server down', data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs credentials to /auth/login and returns the failure envelope on bad creds', async () => {
    const { client, fetchMock, store } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401, jsonBody: envelope(null, 'Invalid credentials', 401) }));

    const result = await client.login(SID, 'alice', 'wrong');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'wrong' }),
    });
    expect(result.ok).toBe(false);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('returns a 500 when login succeeds but no session cookies are issued', async () => {
    const { client, fetchMock, store } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ user: { username: 'alice' } }), setCookies: [] }));

    const result = await client.login(SID, 'alice', 'pw');

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.message).toMatch(/no session tokens/);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('persists the session + password and returns success on valid login', async () => {
    const { client, fetchMock, store } = setup();
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: true, jsonBody: envelope({ user: { username: 'alice' } }), setCookies: authCookies('AT', 'RT') }),
    );

    const result = await client.login(SID, 'alice', 'pw');

    expect(store.set).toHaveBeenCalledWith(SID, { username: 'alice', accessToken: 'AT', refreshToken: 'RT' }, 'pw');
    expect(result.ok).toBe(true);
  });
});

describe('logout', () => {
  it('calls /auth/logout with the session cookies, then clears the session', async () => {
    const { client, fetchMock, store } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true }));

    await client.logout(SID);

    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/logout`, { method: 'POST', headers: { Cookie: COOKIE } });
    expect(store.clear).toHaveBeenCalledWith(SID);
  });

  it('is a no-op network-wise when there is no session, but still clears', async () => {
    const { client, fetchMock, store } = setup();
    store.get.mockReturnValue(undefined);

    await client.logout(SID);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.clear).toHaveBeenCalledWith(SID);
  });

  it('swallows a logout network error and still clears the session', async () => {
    const { client, fetchMock, store } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockRejectedValue(new Error('network'));

    await expect(client.logout(SID)).resolves.toBeUndefined();
    expect(store.clear).toHaveBeenCalledWith(SID);
  });
});

describe('request — gating', () => {
  it('returns 503 (and does not fetch) when the health gate reports an issue', async () => {
    const { client, health, fetchMock } = setup();
    health.ensureHealthy.mockResolvedValue('unhealthy');

    const result = await client.request(SID, '/domains/all-domains');

    expect(result).toEqual({ ok: false, statusCode: 503, message: 'unhealthy', data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 "not logged in" (and does not fetch) when there is no session', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(undefined);

    const result = await client.request(SID, '/domains/all-domains');

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.message).toMatch(/Not logged in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('request — happy path & body shaping', () => {
  it('sends a bodyless GET with only the Cookie header', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope([{ id: 1 }]) }));

    const result = await client.request(SID, '/domains/all-domains');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/domains/all-domains`, {
      method: 'GET',
      headers: { Cookie: COOKIE },
      body: undefined,
    });
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('adds Content-Type and a JSON body only when a body is provided', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ created: true }) }));

    await client.request(SID, '/dns/create-dns', { method: 'POST', body: { name: 'a' } });

    expect(fetchMock).toHaveBeenCalledWith(`${API}/dns/create-dns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({ name: 'a' }),
    });
  });

  it('prepends a one-time "[Using existing session ...]" note on the first call of a session', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope(null, 'Fetched') }));

    const first = await client.request(SID, '/service-info');
    const second = await client.request(SID, '/service-info');

    expect(first.message).toBe('[Using existing session — logged in as "alice"] Fetched');
    expect(second.message).toBe('Fetched'); // note is single-use
  });
});

describe('request — 401 recovery', () => {
  it('silently refreshes the token and retries once on a 401', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // initial call
      .mockResolvedValueOnce(fakeResponse({ ok: true, setCookies: authCookies('AT2', 'RT2') })) // refresh-token
      .mockResolvedValueOnce(fakeResponse({ ok: true, jsonBody: envelope('done') })); // retry

    const result = await client.request(SID, '/service-info');

    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API}/auth/refresh-token`, { method: 'POST', headers: { Cookie: COOKIE } });
    expect(store.updateTokens).toHaveBeenCalledWith(SID, 'AT2', 'RT2');
    expect(result.ok).toBe(true);
    expect(result.data).toBe('done');
  });

  it('falls back to an automatic re-login (with saved credentials) when refresh is rejected', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    store.getCredentials.mockReturnValue({ username: 'alice', password: 'pw' });
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // initial
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // refresh-token rejected
      .mockResolvedValueOnce(fakeResponse({ ok: true, setCookies: authCookies('AT3', 'RT3') })) // auto re-login
      .mockResolvedValueOnce(fakeResponse({ ok: true, jsonBody: envelope('recovered') })); // retry

    const result = await client.request(SID, '/service-info');

    expect(store.set).toHaveBeenCalledWith(SID, { username: 'alice', accessToken: 'AT3', refreshToken: 'RT3' }, 'pw');
    expect(result.data).toBe('recovered');
    expect(result.message).toMatch(/automatically re-authenticated as "alice"/);
  });

  it('clears the session and reports "session expired" when refresh and re-login both fail', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    store.getCredentials.mockReturnValue(undefined); // no saved creds -> no re-login
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // initial
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })); // refresh rejected

    const result = await client.request(SID, '/service-info');

    expect(store.clear).toHaveBeenCalledWith(SID);
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.message).toMatch(/Session expired/);
  });

  it('treats a saved-password that no longer works as a failed re-login', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    store.getCredentials.mockReturnValue({ username: 'alice', password: 'stale' });
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // initial
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })) // refresh rejected
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 })); // re-login rejected

    const result = await client.request(SID, '/service-info');

    expect(result.message).toMatch(/Session expired/);
    expect(store.set).not.toHaveBeenCalled();
  });
});

describe('downloadLogExport', () => {
  it('returns a typed error when the health gate is closed', async () => {
    const { client, health } = setup();
    health.ensureHealthy.mockResolvedValue('down');

    const result = await client.downloadLogExport(SID);

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(503);
  });

  it('parses the JSON envelope on an error response instead of returning raw text', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 404, headers: { 'content-type': 'application/json' }, jsonBody: envelope(null, 'No export', 404) }),
    );

    const result = await client.downloadLogExport(SID);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('No export');
  });

  it('returns the raw text body on a successful text/plain download', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, headers: { 'content-type': 'text/plain' }, textBody: 'log line 1\nlog line 2' }));

    const result = await client.downloadLogExport(SID);

    expect(result.ok).toBe(true);
    expect(result.data).toBe('log line 1\nlog line 2');
    expect(result.message).toContain('Export downloaded');
  });

  it('truncates an oversized export to the 200k-char cap', async () => {
    const { client, store, fetchMock } = setup();
    store.get.mockReturnValue(SESSION);
    const huge = 'a'.repeat(200_001);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, headers: { 'content-type': 'text/plain' }, textBody: huge }));

    const result = await client.downloadLogExport(SID);

    expect(result.data?.length).toBe(200_000);
    expect(result.message).toContain('truncated to 200000 characters');
  });
});
