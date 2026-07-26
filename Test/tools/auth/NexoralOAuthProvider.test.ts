import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { rmSync } from 'node:fs';

// Redirect $HOME to a throwaway temp dir BEFORE the module (whose CLIENTS_FILE is
// computed from homedir() at import) is loaded, so the suite reads/writes real
// files but never touches the developer's actual ~/.nexoraldns.
const tmpHome = vi.hoisted(() => {
  const os = require('node:os');
  const path = require('node:path');
  return path.join(os.tmpdir(), `nexoral-oauth-test-${process.pid}-${Date.now()}`);
});

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => tmpHome };
});

import { NexoralOAuthProvider } from '@tools/source/auth/NexoralOAuthProvider';
import { ToolsKeys } from '@tools/source/core/key';
import { fakeResponse, authCookies } from '../_testUtils/fakeHttp';

const API = ToolsKeys.API_BASE_URL;
const REDIRECT_URI = 'http://127.0.0.1:33418/callback';

const CLIENT = {
  client_id: 'client-1',
  client_name: 'Claude Code',
  redirect_uris: [REDIRECT_URI],
} as any;

function envelope(data: unknown, message = 'ok', statusCode = 200) {
  return { statusCode, message, data };
}

function setup() {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return { provider: new NexoralOAuthProvider(), fetchMock };
}

/** Runs authorize() and returns the request id the login page would be handed. */
async function beginAuthorization(provider: NexoralOAuthProvider, state?: string): Promise<string> {
  const res = { redirect: vi.fn() };
  await provider.authorize(CLIENT, { codeChallenge: 'CHALLENGE', redirectUri: REDIRECT_URI, state }, res as any);
  const target = res.redirect.mock.calls[0][0] as string;
  expect(target).toMatch(/^\/login\?request=[0-9a-f]{32}$/);
  return new URL(target, 'http://localhost').searchParams.get('request') as string;
}

/** Drives authorize + a successful login, returning the issued authorization code. */
async function issueCode(provider: NexoralOAuthProvider, fetchMock: ReturnType<typeof vi.fn>, state?: string): Promise<string> {
  const requestId = await beginAuthorization(provider, state);
  fetchMock.mockResolvedValueOnce(
    fakeResponse({ ok: true, jsonBody: envelope({ user: { username: 'alice' } }), setCookies: authCookies('AT', 'RT') }),
  );
  const result = await provider.completeLogin(requestId, 'alice', 'pw');
  if (!('redirectTo' in result)) throw new Error(`expected a redirect, got: ${result.error}`);
  return new URL(result.redirectTo).searchParams.get('code') as string;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());
afterAll(() => rmSync(tmpHome, { recursive: true, force: true }));

describe('authorize', () => {
  it('parks the request and redirects the browser to this server\'s own login page', async () => {
    const { provider, fetchMock } = setup();

    const requestId = await beginAuthorization(provider);

    expect(provider.clientNameFor(requestId)).toBe('Claude Code');
    expect(fetchMock).not.toHaveBeenCalled(); // nothing hits server/ until credentials arrive
  });

  it('falls back to the client id when the client registered no name', async () => {
    const { provider } = setup();
    const res = { redirect: vi.fn() };

    await provider.authorize(
      { client_id: 'anon-client', redirect_uris: [REDIRECT_URI] } as any,
      { codeChallenge: 'C', redirectUri: REDIRECT_URI },
      res as any,
    );
    const requestId = new URL(res.redirect.mock.calls[0][0] as string, 'http://localhost').searchParams.get('request') as string;

    expect(provider.clientNameFor(requestId)).toBe('anon-client');
  });

  it('reports no client name for an unknown request id', () => {
    const { provider } = setup();
    expect(provider.clientNameFor('nope')).toBeUndefined();
  });
});

describe('completeLogin', () => {
  it('POSTs the credentials to server/ and redirects back with code + state', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider, 'STATE-123');
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: true, jsonBody: envelope({ user: { username: 'alice' } }), setCookies: authCookies('AT', 'RT') }),
    );

    const result = await provider.completeLogin(requestId, 'alice', 'pw');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'pw' }),
    });
    if (!('redirectTo' in result)) throw new Error('expected a redirect');
    const redirect = new URL(result.redirectTo);
    expect(`${redirect.origin}${redirect.pathname}`).toBe(REDIRECT_URI);
    expect(redirect.searchParams.get('code')).toMatch(/^[0-9a-f]{64}$/);
    expect(redirect.searchParams.get('state')).toBe('STATE-123');
  });

  it('omits state when the client sent none', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, setCookies: authCookies('AT', 'RT') }));

    const result = await provider.completeLogin(requestId, 'alice', 'pw');

    if (!('redirectTo' in result)) throw new Error('expected a redirect');
    expect(new URL(result.redirectTo).searchParams.has('state')).toBe(false);
  });

  it('rejects bad credentials without issuing a code', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401, jsonBody: envelope(null, 'Invalid', 401) }));

    const result = await provider.completeLogin(requestId, 'alice', 'wrong');

    expect(result).toEqual({ error: 'Invalid username or password.' });
    // the request survives so the user can retry on the same page
    expect(provider.clientNameFor(requestId)).toBe('Claude Code');
  });

  it('reports an unreachable server rather than throwing', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider);
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    expect(await provider.completeLogin(requestId, 'alice', 'pw')).toEqual({ error: 'NexoralDNS server is unreachable.' });
  });

  it('errors when login succeeds but server/ issued no session cookies', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, setCookies: [] }));

    const result = await provider.completeLogin(requestId, 'alice', 'pw');

    expect(result).toEqual({ error: 'Login succeeded but no session tokens were issued.' });
  });

  it('rejects an unknown or already-consumed request id', async () => {
    const { provider, fetchMock } = setup();

    const result = await provider.completeLogin('deadbeef', 'alice', 'pw');

    expect(result).toEqual({ error: 'This login request has expired — start again from your MCP client.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cannot be replayed: the request id is consumed once a code is issued', async () => {
    const { provider, fetchMock } = setup();
    const requestId = await beginAuthorization(provider);
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, setCookies: authCookies('AT', 'RT') }));

    await provider.completeLogin(requestId, 'alice', 'pw');
    const second = await provider.completeLogin(requestId, 'alice', 'pw');

    expect(second).toEqual({ error: 'This login request has expired — start again from your MCP client.' });
  });
});

describe('challengeForAuthorizationCode', () => {
  it('returns the PKCE challenge captured at /authorize', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    expect(await provider.challengeForAuthorizationCode(CLIENT, code)).toBe('CHALLENGE');
  });

  it('rejects an unknown code', async () => {
    const { provider } = setup();
    await expect(provider.challengeForAuthorizationCode(CLIENT, 'nope')).rejects.toThrowError(/invalid or expired/i);
  });

  it('rejects a code that belongs to a different client', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    await expect(
      provider.challengeForAuthorizationCode({ ...CLIENT, client_id: 'other' } as any, code),
    ).rejects.toThrowError(/invalid or expired/i);
  });
});

describe('exchangeAuthorizationCode', () => {
  it('hands back the JWTs server/ issued, as the OAuth token pair', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    const tokens = await provider.exchangeAuthorizationCode(CLIENT, code, 'verifier', REDIRECT_URI);

    expect(tokens).toEqual({
      access_token: 'AT',
      token_type: 'Bearer',
      expires_in: 1800,
      refresh_token: 'RT',
    });
  });

  it('is single-use — a replayed code is rejected', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    await provider.exchangeAuthorizationCode(CLIENT, code, 'verifier', REDIRECT_URI);

    await expect(provider.exchangeAuthorizationCode(CLIENT, code, 'verifier', REDIRECT_URI)).rejects.toThrowError(
      /invalid or expired/i,
    );
  });

  it('rejects a redirect_uri that differs from the authorization request', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    await expect(
      provider.exchangeAuthorizationCode(CLIENT, code, 'verifier', 'http://evil.test/callback'),
    ).rejects.toThrowError(/redirect_uri does not match/i);
  });

  it('rejects a code redeemed by a different client', async () => {
    const { provider, fetchMock } = setup();
    const code = await issueCode(provider, fetchMock);

    await expect(
      provider.exchangeAuthorizationCode({ ...CLIENT, client_id: 'other' } as any, code, 'verifier', REDIRECT_URI),
    ).rejects.toThrowError(/invalid or expired/i);
  });
});

describe('exchangeRefreshToken', () => {
  it('delegates to server/\'s refresh endpoint and returns the rotated pair', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, setCookies: authCookies('AT2', 'RT2') }));

    const tokens = await provider.exchangeRefreshToken(CLIENT, 'RT');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/refresh-token`, {
      method: 'POST',
      headers: { Cookie: 'refresh_token=RT' },
    });
    expect(tokens.access_token).toBe('AT2');
    expect(tokens.refresh_token).toBe('RT2');
  });

  it('rejects an expired refresh token as invalid_grant', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    await expect(provider.exchangeRefreshToken(CLIENT, 'stale')).rejects.toThrowError(/invalid or expired/i);
  });

  it('surfaces an unreachable server as a server error', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.exchangeRefreshToken(CLIENT, 'RT')).rejects.toThrowError(/unreachable/i);
  });

  it('errors when the refresh returns no cookies', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, setCookies: [] }));

    await expect(provider.exchangeRefreshToken(CLIENT, 'RT')).rejects.toThrowError(/no session tokens/i);
  });
});

describe('verifyAccessToken', () => {
  it('verifies against server/ and returns the token\'s AuthInfo', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ username: 'alice' }) }));

    const info = await provider.verifyAccessToken('AT');

    expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/verify`, { headers: { Cookie: 'access_token=AT' } });
    expect(info.token).toBe('AT');
    expect(info.scopes).toEqual([]);
    expect(info.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('caches a successful verification so repeat calls skip the round trip', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ username: 'alice' }) }));

    await provider.verifyAccessToken('AT');
    await provider.verifyAccessToken('AT');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired token — this is what makes the client refresh and retry', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    await expect(provider.verifyAccessToken('stale')).rejects.toThrowError(/invalid or expired/i);
  });

  it('never caches a rejection', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValueOnce(fakeResponse({ ok: false, status: 401 }));
    await expect(provider.verifyAccessToken('AT')).rejects.toThrow();

    fetchMock.mockResolvedValueOnce(fakeResponse({ ok: true, jsonBody: envelope({ username: 'alice' }) }));
    expect((await provider.verifyAccessToken('AT')).token).toBe('AT');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces an unreachable server as a server error, not an invalid token', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.verifyAccessToken('AT')).rejects.toThrowError(/unreachable/i);
  });
});

describe('revokeToken', () => {
  it('ends the real session via server/\'s logout and drops the cached verification', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: envelope({ username: 'alice' }) }));
    await provider.verifyAccessToken('AT'); // populate the cache

    await provider.revokeToken(CLIENT, { token: 'AT' } as any);

    expect(fetchMock).toHaveBeenLastCalledWith(`${API}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: 'access_token=AT' },
    });

    // cache was invalidated: the next verify hits the network again
    await provider.verifyAccessToken('AT');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('swallows a logout network error', async () => {
    const { provider, fetchMock } = setup();
    fetchMock.mockRejectedValue(new Error('network'));

    await expect(provider.revokeToken(CLIENT, { token: 'AT' } as any)).resolves.toBeUndefined();
  });
});

describe('clientsStore', () => {
  it('persists a dynamically registered client across a restart', async () => {
    const { provider } = setup();
    provider.clientsStore.registerClient(CLIENT);

    // A fresh instance reads the same on-disk file, as a restarted process would.
    const restarted = new NexoralOAuthProvider();

    expect(restarted.clientsStore.getClient('client-1')).toMatchObject({ client_id: 'client-1', client_name: 'Claude Code' });
  });

  it('returns undefined for a client it never registered', () => {
    const { provider } = setup();
    expect(provider.clientsStore.getClient('unknown-client')).toBeUndefined();
  });
});
