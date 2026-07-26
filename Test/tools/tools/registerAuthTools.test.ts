import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({
  default: { request: vi.fn() },
}));

import apiClient from '@tools/source/client/ApiClient';
import registerAuthTools from '@tools/source/tools/registerAuthTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: { done: true } };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerAuthTools', () => {
  it('registers exactly the auth tools', () => {
    const { server, tools } = captureTools();
    registerAuthTools(server);
    expect([...tools.keys()].sort()).toEqual(['change_password', 'verify_session']);
  });

  it('exposes no credential-taking tool — login happens in the browser via OAuth', () => {
    const { server, tools } = captureTools();
    registerAuthTools(server);

    for (const tool of tools.values()) {
      expect(Object.keys(tool.config.inputSchema ?? {})).not.toContain('username');
    }
    expect(tools.has('login')).toBe(false);
    expect(tools.has('logout')).toBe(false);
  });

  it('change_password: POSTs current + new password to /auth/change-password', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);

    await cap.call('change_password', { currentPassword: 'old', newPassword: 'newpass' }, 'tok');

    expect(api.request).toHaveBeenCalledWith('tok', '/auth/change-password', {
      method: 'POST',
      body: { currentPassword: 'old', newPassword: 'newpass' },
    });
  });

  it('verify_session: GETs /auth/verify', async () => {
    const cap = captureTools();
    registerAuthTools(cap.server);

    await cap.call('verify_session', {}, 'tok');

    expect(api.request).toHaveBeenCalledWith('tok', '/auth/verify');
  });
});
