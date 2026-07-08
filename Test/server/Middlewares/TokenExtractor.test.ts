import { describe, it, expect } from 'vitest';
import { CookieHeaderTokenExtractor } from '@server/source/Middlewares/TokenExtractor';
import { createFakeRequest } from '../_testUtils/fakeRequest';

const extractor = new CookieHeaderTokenExtractor();

describe('CookieHeaderTokenExtractor', () => {
  it('prefers the access_token cookie', () => {
    const req = createFakeRequest({ cookies: { access_token: 'cookie-token' }, headers: { authorization: 'Bearer header-token' } });
    expect(extractor.extract(req)).toBe('cookie-token');
  });

  it('falls back to a Bearer Authorization header, stripping the scheme', () => {
    const req = createFakeRequest({ headers: { authorization: 'Bearer header-token' } });
    expect(extractor.extract(req)).toBe('header-token');
  });

  it('returns a raw Authorization header value (no Bearer prefix) as-is', () => {
    const req = createFakeRequest({ headers: { authorization: 'raw-token' } });
    expect(extractor.extract(req)).toBe('raw-token');
  });

  it('trims whitespace after the Bearer scheme', () => {
    const req = createFakeRequest({ headers: { authorization: 'Bearer    spaced-token' } });
    expect(extractor.extract(req)).toBe('spaced-token');
  });

  it('returns null when neither cookie nor header is present', () => {
    expect(extractor.extract(createFakeRequest())).toBeNull();
  });
});
