import { describe, it, expect } from 'vitest';
import CacheKeys, { getACLKeyForIP, QueueKeys, DNS_QUERY_STATUS_KEYS } from '@server/source/Redis/CacheKeys.cache';

describe('CacheKeys', () => {
  it('exposes the stable Redis key names', () => {
    expect(CacheKeys.Service_Status).toBe('dns-server-status');
    expect(CacheKeys.Domain_DNS_Record).toBe('Domain_DNS_Record');
    expect(CacheKeys.DnsQueryDetailsStore).toBe('DNS_QUERY');
    expect(CacheKeys.ACL_All_Users).toBe('acl:all_users');
    expect(CacheKeys.ACL_Metadata).toBe('acl:metadata');
  });

  it('getACLKeyForIP namespaces per IP', () => {
    expect(getACLKeyForIP('10.0.0.1')).toBe('acl:ip:10.0.0.1');
  });

  it('exposes queue keys', () => {
    expect(QueueKeys.DNS_Analytics).toBe('DNS_analytics');
    expect(QueueKeys.LOGS_EXPORT).toBe('logs_export');
  });

  it('exposes DNS query status keys', () => {
    expect(DNS_QUERY_STATUS_KEYS.RESOLVED).toBe('RESOLVED');
    expect(DNS_QUERY_STATUS_KEYS.NOT_FOUND).toBe('DOMAIN NOT FOUND');
    expect(DNS_QUERY_STATUS_KEYS.FROM_CACHE).toBe('FROM REDIS CACHE');
  });
});
