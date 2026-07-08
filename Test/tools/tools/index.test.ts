import { describe, it, expect, vi } from 'vitest';

// registerAllTools pulls in every register module, each of which imports the
// ApiClient singleton — mock it so no filesystem/session state is touched.
vi.mock('@tools/source/client/ApiClient', () => ({
  default: { request: vi.fn(), login: vi.fn(), logout: vi.fn(), checkHealth: vi.fn(), getServerInfo: vi.fn(), downloadLogExport: vi.fn() },
}));

import registerAllTools from '@tools/source/tools/index';
import { captureTools } from '../_testUtils/fakeMcpServer';

describe('registerAllTools', () => {
  it('registers the full catalog of tools with no duplicate names', () => {
    const { server, tools } = captureTools();

    registerAllTools(server);

    // 4 auth + 3 public + 3 domain + 4 dns + 6 user + 6 role + 17 access-control + 2 dhcp + 6 settings + 5 analytics
    expect(tools.size).toBe(56);
  });

  it('exposes at least one representative tool from every domain', () => {
    const { server, tools } = captureTools();
    registerAllTools(server);

    for (const name of [
      'login', 'get_server_info', 'list_domains', 'create_dns_record', 'list_users',
      'create_role', 'create_access_policy', 'list_connected_ips', 'toggle_dns_service', 'get_logs',
    ]) {
      expect(tools.has(name)).toBe(true);
    }
  });

  it('gives every registered tool a title, description and handler', () => {
    const { server, tools } = captureTools();
    registerAllTools(server);

    for (const tool of tools.values()) {
      expect(tool.config.title, tool.name).toBeTruthy();
      expect(tool.config.description, tool.name).toBeTruthy();
      expect(typeof tool.handler, tool.name).toBe('function');
    }
  });
});
