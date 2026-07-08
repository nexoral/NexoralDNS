import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({
  default: { request: vi.fn(), getServerInfo: vi.fn(), checkHealth: vi.fn() },
}));

import apiClient from '@tools/source/client/ApiClient';
import registerPublicTools from '@tools/source/tools/registerPublicTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as {
  request: ReturnType<typeof vi.fn>;
  getServerInfo: ReturnType<typeof vi.fn>;
  checkHealth: ReturnType<typeof vi.fn>;
};
const OK = { ok: true, statusCode: 200, message: 'ok', data: { v: 1 } };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerPublicTools', () => {
  it('registers exactly the public tools', () => {
    const { server, tools } = captureTools();
    registerPublicTools(server);
    expect([...tools.keys()].sort()).toEqual(['check_server_health', 'get_server_info', 'get_service_info']);
  });

  it('get_server_info: delegates to apiClient.getServerInfo (no auth)', async () => {
    const cap = captureTools();
    registerPublicTools(cap.server);
    api.getServerInfo.mockResolvedValue(OK);

    const out = await cap.call('get_server_info', {});

    expect(api.getServerInfo).toHaveBeenCalledTimes(1);
    expect(out.isError).toBe(false);
  });

  it('get_server_info: reports an error result when the call fails', async () => {
    const cap = captureTools();
    registerPublicTools(cap.server);
    api.getServerInfo.mockResolvedValue({ ok: false, statusCode: 500, message: 'boom', data: null });

    const out = await cap.call('get_server_info', {});

    expect(out.isError).toBe(true);
    expect(out.content[0].text).toMatch(/Error \(500\): boom/);
  });

  it('check_server_health: delegates to apiClient.checkHealth and flags unhealthy as an error', async () => {
    const cap = captureTools();
    registerPublicTools(cap.server);
    api.checkHealth.mockResolvedValue({ ok: false, statusCode: 503, message: 'down', data: null });

    const out = await cap.call('check_server_health', {});

    expect(api.checkHealth).toHaveBeenCalledTimes(1);
    expect(out.isError).toBe(true);
  });

  it('get_service_info: GETs /service-info (requires login)', async () => {
    const cap = captureTools();
    registerPublicTools(cap.server);

    await cap.call('get_service_info', {}, 'sid');

    expect(api.request).toHaveBeenCalledWith('sid', '/service-info');
  });
});
