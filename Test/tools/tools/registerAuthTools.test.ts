import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({
  default: { request: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));

import apiClient from '@tools/source/client/ApiClient';
import registerAuthTools from '@tools/source/tools/registerAuthTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: { done: true } };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerAuthTools', () => {
  it('registers exactly the auth tools', () => {
    const { server, tools } = captureTools();
    registerAuthTools(server);
    expect([...tools.keys()].sort()).toEqual(['change_password', 'login', 'logout', 'verify_session']);
  });

  it('login: delegates to apiClient.login and reports success', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);
    api.login.mockResolvedValue({ ok: true, statusCode: 200, message: 'ok', data: null });

    const out = await cap.call('login', { username: 'alice', password: 'pw' }, 'sid');

    expect(api.login).toHaveBeenCalledWith('sid', 'alice', 'pw');
    expect(out.isError).toBe(false);
    expect(out.content[0].text).toBe('Logged in as alice.');
  });

  it('login: surfaces an auth failure as an error result', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);
    api.login.mockResolvedValue({ ok: false, statusCode: 401, message: 'Invalid credentials', data: null });

    const out = await cap.call('login', { username: 'alice', password: 'bad' }, 'sid');

    expect(out.isError).toBe(true);
    expect(out.content[0].text).toMatch(/Login failed: Invalid credentials/);
  });

  it('logout: delegates to apiClient.logout for the session', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);
    api.logout.mockResolvedValue(undefined);

    const out = await cap.call('logout', {}, 'sid');

    expect(api.logout).toHaveBeenCalledWith('sid');
    expect(out.content[0].text).toBe('Logged out.');
  });

  it('change_password: POSTs current + new password to /auth/change-password', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);

    await cap.call('change_password', { currentPassword: 'old', newPassword: 'newpass' }, 'sid');

    expect(api.request).toHaveBeenCalledWith('sid', '/auth/change-password', {
      method: 'POST',
      body: { currentPassword: 'old', newPassword: 'newpass' },
    });
  });

  it('verify_session: GETs /auth/verify', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);

    await cap.call('verify_session', {}, 'sid');

    expect(api.request).toHaveBeenCalledWith('sid', '/auth/verify');
  });
});
