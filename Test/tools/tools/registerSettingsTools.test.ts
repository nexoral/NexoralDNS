import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerSettingsTools from '@tools/source/tools/registerSettingsTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerSettingsTools', () => {
  it('registers exactly the settings tools', () => {
    const { server, tools } = captureTools();
    registerSettingsTools(server);
    expect([...tools.keys()].sort()).toEqual([
      'delete_all_dns_cache', 'delete_specific_cache_key', 'get_cache_stats', 'get_default_ttl', 'toggle_dns_service', 'update_default_ttl',
    ]);
  });

  it('toggle_dns_service: GETs /settings/toggle-service', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('toggle_dns_service', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/toggle-service');
  });

  it('get_default_ttl: GETs /settings/default-ttl', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('get_default_ttl', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/default-ttl');
  });

  it('update_default_ttl: PUTs the new TTL', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('update_default_ttl', { defaultTTL: 3600 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/default-ttl', { method: 'PUT', body: { defaultTTL: 3600 } });
  });

  it('get_cache_stats: GETs /settings/get-cache-stat', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('get_cache_stats', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/get-cache-stat');
  });

  it('delete_all_dns_cache: DELETEs /settings/delete-all-dns-cache', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('delete_all_dns_cache', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/delete-all-dns-cache', { method: 'DELETE' });
  });

  it('delete_specific_cache_key: DELETEs with the key name in the query string', async () => {
    const cap = captureTools();
    registerSettingsTools(cap.server);
    await cap.call('delete_specific_cache_key', { keyName: 'dns:a.com' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/settings/delete-specific-cache-key?keyName=dns%3Aa.com', { method: 'DELETE' });
  });
});
