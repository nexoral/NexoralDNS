import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HealthMonitor from '@tools/source/client/HealthMonitor';
import { ToolsKeys } from '@tools/source/core/key';
import { fakeResponse } from '../_testUtils/fakeHttp';

const HEALTH_URL = `${ToolsKeys.API_BASE_URL}/health`;

function healthyBody() {
  return { statusCode: 200, message: 'ok', data: { status: 'ok', timestamp: 't', details: {} } };
}
function unhealthyBody() {
  return { statusCode: 200, message: 'degraded', data: { status: 'unhealthy', timestamp: 't', details: { redis: 'down' } } };
}

describe('HealthMonitor', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('checkHealth', () => {
    it('hits GET /api/health and returns the parsed envelope', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: healthyBody() }));

      const result = await new HealthMonitor().checkHealth();

      expect(fetchMock).toHaveBeenCalledWith(HEALTH_URL, expect.objectContaining({ signal: expect.anything() }));
      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('ok');
    });

    it('returns a 503 "unreachable" result when fetch rejects (server down / timeout)', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await new HealthMonitor().checkHealth();

      expect(result.ok).toBe(false);
      expect(result.statusCode).toBe(503);
      expect(result.message).toMatch(/unreachable: ECONNREFUSED/);
      expect(result.data).toBeNull();
    });

    it('stringifies a non-Error rejection reason', async () => {
      fetchMock.mockRejectedValue('boom');

      const result = await new HealthMonitor().checkHealth();

      expect(result.message).toMatch(/unreachable: boom/);
    });
  });

  describe('ensureHealthy', () => {
    it('returns null (no issue) when the server reports status ok', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: healthyBody() }));
      expect(await new HealthMonitor().ensureHealthy()).toBeNull();
    });

    it('returns an explanatory message when the server is reachable but unhealthy', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: unhealthyBody() }));

      const issue = await new HealthMonitor().ensureHealthy();

      expect(issue).toMatch(/not healthy/);
      expect(issue).toMatch(/operations are unavailable/);
    });

    it('returns a message when the health endpoint itself errors', async () => {
      fetchMock.mockRejectedValue(new Error('down'));
      expect(await new HealthMonitor().ensureHealthy()).toMatch(/not healthy/);
    });

    it('caches the result for the TTL window (no second fetch)', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: healthyBody() }));
      const monitor = new HealthMonitor();

      await monitor.ensureHealthy();
      vi.advanceTimersByTime(2000); // < 3000ms TTL
      await monitor.ensureHealthy();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('re-checks once the cache TTL has elapsed', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: true, jsonBody: healthyBody() }));
      const monitor = new HealthMonitor();

      await monitor.ensureHealthy();
      vi.advanceTimersByTime(3001); // past 3000ms TTL
      await monitor.ensureHealthy();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
