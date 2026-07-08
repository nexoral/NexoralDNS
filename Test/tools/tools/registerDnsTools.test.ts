import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerDnsTools from '@tools/source/tools/registerDnsTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerDnsTools', () => {
  it('registers exactly the DNS record tools', () => {
    const { server, tools } = captureTools();
    registerDnsTools(server);
    expect([...tools.keys()].sort()).toEqual(['create_dns_record', 'delete_dns_record', 'list_dns_records', 'update_dns_record']);
  });

  it('list_dns_records: GETs /dns/list/<domain> URL-encoding the domain', async () => {
    const cap = captureTools();
    registerDnsTools(cap.server);
    await cap.call('list_dns_records', { domain: 'a b.com' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dns/list/a%20b.com');
  });

  it('create_dns_record: POSTs the record with server-side field names', async () => {
    const cap = captureTools();
    registerDnsTools(cap.server);
    await cap.call('create_dns_record', { domainName: 'x.com', name: 'www', type: 'A', value: '10.0.0.1', ttl: 300 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dns/create-dns', {
      method: 'POST',
      body: { DomainName: 'x.com', name: 'www', type: 'A', value: '10.0.0.1', ttl: 300 },
    });
  });

  it('update_dns_record: PUTs /dns/update/<id> with only the record fields', async () => {
    const cap = captureTools();
    registerDnsTools(cap.server);
    await cap.call('update_dns_record', { id: 'rec 1', name: 'api', type: 'CNAME', value: 't.com', ttl: 60 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dns/update/rec%201', {
      method: 'PUT',
      body: { name: 'api', type: 'CNAME', value: 't.com', ttl: 60 },
    });
  });

  it('delete_dns_record: PUTs /dns/delete with id + domainName', async () => {
    const cap = captureTools();
    registerDnsTools(cap.server);
    await cap.call('delete_dns_record', { id: 'rec1', domainName: 'x.com' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/dns/delete', { method: 'PUT', body: { id: 'rec1', domainName: 'x.com' } });
  });
});
