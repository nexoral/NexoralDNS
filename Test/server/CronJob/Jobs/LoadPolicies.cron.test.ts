import { describe, expect, it } from 'vitest';
import { normalizeDomainEntry } from '@server/source/CronJob/Jobs/LoadPolicies.cron';

describe('normalizeDomainEntry', () => {
  it('uses the DNS canonical form for exact domains', () => {
    expect(normalizeDomainEntry(' Example.COM. ')).toEqual({
      domain: 'example.com',
      isWildcard: false,
    });
  });

  it('preserves wildcard semantics while normalizing the pattern', () => {
    expect(normalizeDomainEntry({ domain: '*.Example.COM.', isWildcard: false })).toEqual({
      domain: '*.example.com',
      isWildcard: true,
    });
  });

  it('rejects entries without a usable domain', () => {
    expect(normalizeDomainEntry({ domain: '   ', isWildcard: false })).toBeNull();
  });
});
