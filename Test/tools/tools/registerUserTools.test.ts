import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerUserTools from '@tools/source/tools/registerUserTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerUserTools', () => {
  it('registers exactly the user tools', () => {
    const { server, tools } = captureTools();
    registerUserTools(server);
    expect([...tools.keys()].sort()).toEqual([
      'create_user', 'delete_user', 'get_user', 'list_users', 'reset_user_password', 'update_user',
    ]);
  });

  it('list_users: appends a pagination query string', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('list_users', { skip: 10, limit: 25 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users?skip=10&limit=25');
  });

  it('list_users: omits the query string when no pagination is given', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('list_users', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users');
  });

  it('get_user: GETs /users/<id> URL-encoded', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('get_user', { userId: 'u/1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users/u%2F1');
  });

  it('create_user: POSTs username/password/roleId', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('create_user', { username: 'bob', password: 'tmp', roleId: 'r1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users', { method: 'POST', body: { username: 'bob', password: 'tmp', roleId: 'r1' } });
  });

  it('update_user: PUTs /users/<id> with the provided fields', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('update_user', { userId: 'u1', username: 'bobby', roleId: 'r2', isActive: false }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users/u1', { method: 'PUT', body: { username: 'bobby', roleId: 'r2', isActive: false } });
  });

  it('reset_user_password: PATCHes /users/<id>/reset-password', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('reset_user_password', { userId: 'u1', newPassword: 'np' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users/u1/reset-password', { method: 'PATCH', body: { newPassword: 'np' } });
  });

  it('delete_user: DELETEs /users/<id>', async () => {
    const cap = captureTools();
    registerUserTools(cap.server);
    await cap.call('delete_user', { userId: 'u1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/users/u1', { method: 'DELETE' });
  });
});
