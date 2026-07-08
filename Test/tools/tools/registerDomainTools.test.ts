import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerDomainTools from '@tools/source/tools/registerDomainTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerDomainTools', () => {
  it('registers exactly the domain tools', () => {
    const { server, tools } = captureTools();
    registerDomainTools(server);
    expect([...tools.keys()].sort()).toEqual(['create_domain', 'delete_domain', 'list_domains']);
  });

  it('list_domains: GETs /domains/all-domains', async () => {
    const cap = captureTools();
    registerDomainTools(cap.server);
    await cap.call('list_domains', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/domains/all-domains');
  });

  it('create_domain: POSTs the domain with server-side field names', async () => {
    const cap = captureTools();
    registerDomainTools(cap.server);
    await cap.call('create_domain', { domainName: 'x.com', type: 'A', ipAddress: '10.0.0.1' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/domains/create-domain', {
      method: 'POST',
      body: { DomainName: 'x.com', type: 'A', IpAddress: '10.0.0.1' },
    });
  });

  it('delete_domain: DELETEs /domains/delete with the domain name', async () => {
    const cap = captureTools();
    registerDomainTools(cap.server);
    await cap.call('delete_domain', { domainName: 'x.com' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/domains/delete', { method: 'DELETE', body: { domainName: 'x.com' } });
  });
});
