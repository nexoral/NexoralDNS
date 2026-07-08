import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tools/source/client/ApiClient', () => ({
  default: { request: vi.fn(), downloadLogExport: vi.fn() },
}));

import apiClient from '@tools/source/client/ApiClient';
import registerAnalyticsTools from '@tools/source/tools/registerAnalyticsTools';
import { captureTools } from '../_testUtils/fakeMcpServer';

const api = apiClient as unknown as { request: ReturnType<typeof vi.fn>; downloadLogExport: ReturnType<typeof vi.fn> };
const OK = { ok: true, statusCode: 200, message: 'ok', data: null };

beforeEach(() => {
  vi.clearAllMocks();
  api.request.mockResolvedValue(OK);
});

describe('registerAnalyticsTools', () => {
  it('registers exactly the analytics tools', () => {
    const { server, tools } = captureTools();
    registerAnalyticsTools(server);
    expect([...tools.keys()].sort()).toEqual([
      'download_log_export', 'get_dashboard_analytics', 'get_log_export_status', 'get_logs', 'request_log_export',
    ]);
  });

  it('get_dashboard_analytics: GETs /analytics/get-dashboard-data', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    await cap.call('get_dashboard_analytics', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/analytics/get-dashboard-data');
  });

  it('get_logs: appends filters plus pagination to the query string', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    await cap.call('get_logs', { SourceIP: '10.0.0.1', Status: 'BLOCKED', limit: 20, page: 3 }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/analytics/get-logs?SourceIP=10.0.0.1&Status=BLOCKED&limit=20&page=3');
  });

  it('get_logs: works with no filters at all', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    await cap.call('get_logs', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/analytics/get-logs');
  });

  it('request_log_export: POSTs the format plus filters', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    await cap.call('request_log_export', { format: 'txt', queryName: 'x.com' }, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/analytics/export-logs', { method: 'POST', body: { format: 'txt', queryName: 'x.com' } });
  });

  it('get_log_export_status: GETs /analytics/export-logs/status', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    await cap.call('get_log_export_status', {}, 'sid');
    expect(api.request).toHaveBeenCalledWith('sid', '/analytics/export-logs/status');
  });

  it('download_log_export: returns the downloaded text on success', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    api.downloadLogExport.mockResolvedValue({ ok: true, statusCode: 200, message: 'Export downloaded', data: 'log lines' });

    const out = await cap.call('download_log_export', {}, 'sid');

    expect(api.downloadLogExport).toHaveBeenCalledWith('sid');
    expect(out.isError).toBe(false);
    expect(out.content[0].text).toBe('log lines');
  });

  it('download_log_export: surfaces a failed download as an error result', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    api.downloadLogExport.mockResolvedValue({ ok: false, statusCode: 404, message: 'No export available', data: null });

    const out = await cap.call('download_log_export', {}, 'sid');

    expect(out.isError).toBe(true);
    expect(out.content[0].text).toMatch(/Error \(404\): No export available/);
  });

  it('download_log_export: renders empty text when data is null but ok', async () => {
    const cap = captureTools();
    registerAnalyticsTools(cap.server);
    api.downloadLogExport.mockResolvedValue({ ok: true, statusCode: 200, message: 'ok', data: null });

    const out = await cap.call('download_log_export', {}, 'sid');

    expect(out.content[0].text).toBe('');
  });
});
