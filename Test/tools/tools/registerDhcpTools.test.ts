import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerDhcpTools from '@tools/source/tools/registerDhcpTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerDhcpTools', () => {
  it('registers exactly the DHCP tools', () => {
    const { server, tools } = captureTools();
    registerDhcpTools(server);
    expect([...tools.keys()].sort()).toEqual(['list_connected_ips', 'refresh_connected_ips']);
  });

  it('list_connected_ips: GETs /dhcp/list-of-available-ips', async () => {
    const cap = captureTools();
    registerDhcpTools(cap.server);
    await cap.call('list_connected_ips', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dhcp/list-of-available-ips');
  });

  it('refresh_connected_ips: GETs /dhcp/refresh-connected-ips', async () => {
    const cap = captureTools();
    registerDhcpTools(cap.server);
    await cap.call('refresh_connected_ips', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dhcp/refresh-connected-ips');
  });
});
