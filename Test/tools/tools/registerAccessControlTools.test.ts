import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({ default: { request: vi.fn() } }));

import apiClient from '@tools/source/client/ApiClient';
import registerAccessControlTools from '@tools/source/tools/registerAccessControlTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

function setup() {
  const cap = captureTools();
  registerAccessControlTools(cap.server);
  return cap;
}

describe('registerAccessControlTools', () => {
  it('registers all policy, domain-group and IP-group tools', () => {
    const { tools } = setup();
    expect([...tools.keys()].sort()).toEqual([
      'create_access_policy', 'create_domain_group', 'create_ip_group',
      'delete_access_policy', 'delete_domain_group', 'delete_ip_group',
      'get_access_policy', 'get_domain_group', 'get_ip_group',
      'invalidate_access_control_cache',
      'list_access_policies', 'list_domain_groups', 'list_ip_groups',
      'toggle_access_policy',
      'update_access_policy', 'update_domain_group', 'update_ip_group',
    ]);
  });

  describe('policies', () => {
    it('create_access_policy: POSTs the required fields plus target/block extras', async () => {
      const cap = setup();
      await cap.call('create_access_policy', {
        policyType: 'user_domain', targetType: 'single_ip', blockType: 'specific_domains',
        policyName: 'p1', isActive: true, targetIP: '10.0.0.5', domains: ['ads.com'],
      }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policy', {
        method: 'POST',
        body: {
          policyType: 'user_domain', targetType: 'single_ip', blockType: 'specific_domains',
          policyName: 'p1', isActive: true, targetIP: '10.0.0.5', domains: ['ads.com'],
        },
      });
    });

    it('list_access_policies: appends filter/skip/limit query', async () => {
      const cap = setup();
      await cap.call('list_access_policies', { filter: 'active', skip: 0, limit: 20 }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policies?filter=active&skip=0&limit=20');
    });

    it('get_access_policy: GETs /access-control/policy/<id>', async () => {
      const cap = setup();
      await cap.call('get_access_policy', { policyId: 'p1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policy/p1');
    });

    it('update_access_policy: PUTs /access-control/policy/<id> with everything except the id', async () => {
      const cap = setup();
      await cap.call('update_access_policy', { policyId: 'p1', policyName: 'renamed', isActive: false, targetIP: '1.2.3.4' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policy/p1', {
        method: 'PUT',
        body: { policyName: 'renamed', isActive: false, targetIP: '1.2.3.4' },
      });
    });

    it('toggle_access_policy: PATCHes /access-control/policy/<id>/toggle', async () => {
      const cap = setup();
      await cap.call('toggle_access_policy', { policyId: 'p1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policy/p1/toggle', { method: 'PATCH' });
    });

    it('delete_access_policy: DELETEs /access-control/policy/<id>', async () => {
      const cap = setup();
      await cap.call('delete_access_policy', { policyId: 'p1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/policy/p1', { method: 'DELETE' });
    });

    it('invalidate_access_control_cache: POSTs the cache invalidate endpoint', async () => {
      const cap = setup();
      await cap.call('invalidate_access_control_cache', {}, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/cache/invalidate', { method: 'POST' });
    });
  });

  describe('domain groups', () => {
    it('create_domain_group: POSTs name/description/domains', async () => {
      const cap = setup();
      await cap.call('create_domain_group', { name: 'g', description: 'd', domains: ['a.com', { domain: 'b.com', isWildcard: true }] }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/domain-group', {
        method: 'POST',
        body: { name: 'g', description: 'd', domains: ['a.com', { domain: 'b.com', isWildcard: true }] },
      });
    });

    it('list_domain_groups: GETs /access-control/domain-groups', async () => {
      const cap = setup();
      await cap.call('list_domain_groups', {}, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/domain-groups');
    });

    it('get_domain_group: GETs /access-control/domain-group/<id>', async () => {
      const cap = setup();
      await cap.call('get_domain_group', { groupId: 'g1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/domain-group/g1');
    });

    it('update_domain_group: PUTs /access-control/domain-group/<id> without the id in the body', async () => {
      const cap = setup();
      await cap.call('update_domain_group', { groupId: 'g1', name: 'g2', domains: ['c.com'] }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/domain-group/g1', {
        method: 'PUT',
        body: { name: 'g2', domains: ['c.com'] },
      });
    });

    it('delete_domain_group: DELETEs /access-control/domain-group/<id>', async () => {
      const cap = setup();
      await cap.call('delete_domain_group', { groupId: 'g1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/domain-group/g1', { method: 'DELETE' });
    });
  });

  describe('IP groups', () => {
    it('create_ip_group: POSTs name/description/ipAddresses', async () => {
      const cap = setup();
      await cap.call('create_ip_group', { name: 'ipg', description: 'd', ipAddresses: ['10.0.0.1', '10.0.0.2'] }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/ip-group', {
        method: 'POST',
        body: { name: 'ipg', description: 'd', ipAddresses: ['10.0.0.1', '10.0.0.2'] },
      });
    });

    it('list_ip_groups: GETs /access-control/ip-groups', async () => {
      const cap = setup();
      await cap.call('list_ip_groups', {}, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/ip-groups');
    });

    it('get_ip_group: GETs /access-control/ip-group/<id>', async () => {
      const cap = setup();
      await cap.call('get_ip_group', { groupId: 'ipg1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/ip-group/ipg1');
    });

    it('update_ip_group: PUTs /access-control/ip-group/<id> without the id in the body', async () => {
      const cap = setup();
      await cap.call('update_ip_group', { groupId: 'ipg1', name: 'renamed', ipAddresses: ['10.0.0.9'] }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/ip-group/ipg1', {
        method: 'PUT',
        body: { name: 'renamed', ipAddresses: ['10.0.0.9'] },
      });
    });

    it('delete_ip_group: DELETEs /access-control/ip-group/<id>', async () => {
      const cap = setup();
      await cap.call('delete_ip_group', { groupId: 'ipg1' }, 'sid');
      expect(api.request).toHaveBeenCalledWith('sid', '/access-control/ip-group/ipg1', { method: 'DELETE' });
    });
  });
});
