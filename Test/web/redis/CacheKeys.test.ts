import { describe, it, expect } from 'vitest';
import CacheKeys, { QueueKeys, DNS_QUERY_STATUS_KEYS } from '@web/Redis/CacheKeys.cache';

describe('CacheKeys / QueueKeys / DNS_QUERY_STATUS_KEYS', () => {
  it('exposes the stable Redis cache key names', () => {
    expect(CacheKeys.Service_Status).toBe('dns-server-status');
    expect(CacheKeys.Domain_DNS_Record).toBe('Domain_DNS_Record');
  });

  it('exposes the analytics queue name', () => {
    expect(QueueKeys.DNS_Analytics).toBe('DNS_analytics');
  });

  it('exposes every DNS query status label used by the pipeline', () => {
    expect(DNS_QUERY_STATUS_KEYS.FROM_DB).toBe('FROM DB');
    expect(DNS_QUERY_STATUS_KEYS.FROM_CACHE).toBe('FROM REDIS CACHE');
    expect(DNS_QUERY_STATUS_KEYS.RESOLVED).toBe('RESOLVED');
    expect(DNS_QUERY_STATUS_KEYS.NOT_FOUND).toBe('DOMAIN NOT FOUND');
    expect(DNS_QUERY_STATUS_KEYS.FORWARDED).toBe('DNS REQUEST FORWARDED');
    expect(DNS_QUERY_STATUS_KEYS.FAILED).toBe('FAILED TO PROCESS');
    expect(DNS_QUERY_STATUS_KEYS.SERVICE_DOWN).toBe('SERVICE_DOWN');
    expect(DNS_QUERY_STATUS_KEYS.SERVICE_DOWN_FROM).toBe('SYSTEM');
    expect(DNS_QUERY_STATUS_KEYS.FORWARDED_STATUS).toBe('FORWARDED');
    expect(DNS_QUERY_STATUS_KEYS.BLOCKED).toBe('BLOCKED');
    expect(DNS_QUERY_STATUS_KEYS.FROM_BLOCKED).toBe('BY RULE');
    expect(DNS_QUERY_STATUS_KEYS.FAIL_SAFE).toBe('RESOLVED (FAIL-SAFE)');
    expect(DNS_QUERY_STATUS_KEYS.FROM_FAIL_SAFE).toBe('FAIL-SAFE BYPASS');
  });
});
