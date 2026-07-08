import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerRoleTools from '@tools/source/tools/registerRoleTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerRoleTools', () => {
  it('registers exactly the role tools', () => {
    const { server, tools } = captureTools();
    registerRoleTools(server);
    expect([...tools.keys()].sort()).toEqual([
      'create_role', 'delete_role', 'get_role', 'list_permissions', 'list_roles', 'update_role',
    ]);
  });

  it('list_permissions: GETs /roles/permissions', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('list_permissions', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles/permissions');
  });

  it('list_roles: appends a pagination query string', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('list_roles', { skip: 0, limit: 5 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles?skip=0&limit=5');
  });

  it('get_role: GETs /roles/<id> URL-encoded', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('get_role', { roleId: 'r 1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles/r%201');
  });

  it('create_role: POSTs name + permission codes', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('create_role', { name: 'ops', permissionCodes: [1, 2, 3] }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles', { method: 'POST', body: { name: 'ops', permissionCodes: [1, 2, 3] } });
  });

  it('update_role: PUTs /roles/<id> with the provided fields', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('update_role', { roleId: 'r1', name: 'ops2', permissionCodes: [4] }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles/r1', { method: 'PUT', body: { name: 'ops2', permissionCodes: [4] } });
  });

  it('delete_role: DELETEs /roles/<id>', async () => {
    const cap = captureTools();
    registerRoleTools(cap.server);
    await cap.call('delete_role', { roleId: 'r1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/roles/r1', { method: 'DELETE' });
  });
});
