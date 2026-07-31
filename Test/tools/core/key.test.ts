import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ToolsKeys,
  MCP_SERVER_INFO,
  MCP_PUBLIC_URL,
  MCP_PATH,
  LOGIN_PATH,
  ACCESS_TOKEN_TTL_SECONDS,
} from '@tools/source/core/key';

describe('ToolsKeys', () => {
  it('pins the MCP tool server port, bind host, and REST API base URL', () => {
    expect(ToolsKeys.PORT).toBe(4774);
    expect(ToolsKeys.HOST).toBe('0.0.0.0');
    expect(ToolsKeys.API_BASE_URL).toBe('http://127.0.0.1:4773/api');
  });

  it('targets the loopback REST API (LAN-only, never a public host)', () => {
    expect(ToolsKeys.API_BASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:/);
  });
});

describe('MCP_SERVER_INFO', () => {
  it('advertises the tool server name and version', () => {
    expect(MCP_SERVER_INFO).toEqual({ name: 'nexoraldns-mcp-tools', version: '1.0.0' });
  });
});

describe('OAuth-facing configuration', () => {
  it('defaults the public origin to loopback — the only origin OAuth 2.1 allows over plain http', () => {
    expect(MCP_PUBLIC_URL).toBe(`http://localhost:${ToolsKeys.PORT}`);
  });

  it('pins the MCP and login paths baked into the discovery metadata', () => {
    expect(MCP_PATH).toBe('/mcp');
    expect(LOGIN_PATH).toBe('/login');
  });

  it("mirrors server/'s 30-minute access token lifetime", () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(30 * 60);
  });
});

describe('MCP_PUBLIC_URL resolution', () => {
  /** Re-imports key.ts under a fake set of network interfaces, so the result doesn't depend on the CI host. */
  async function reimportWith(env: Record<string, string>, lanAddress?: string) {
    vi.resetModules();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.doMock('node:os', async () => {
      const actual = await vi.importActual<typeof import('node:os')>('node:os');
      return {
        ...actual,
        networkInterfaces: () => ({
          lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
          ...(lanAddress ? { eth0: [{ family: 'IPv4', internal: false, address: lanAddress }] } : {}),
        }),
      };
    });
    return import('@tools/source/core/key');
  }

  afterEach(() => {
    vi.doUnmock('node:os');
    vi.resetModules();
  });

  it('stays on loopback by default, the only origin OAuth 2.1 allows over plain http', async () => {
    const key = await reimportWith({}, '192.168.1.50');
    expect(key.MCP_PUBLIC_URL).toBe('http://localhost:4774');
  });

  it('switches to the machine\'s LAN address once insecure issuer URLs are allowed', async () => {
    const key = await reimportWith({ MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL: 'true' }, '192.168.1.50');
    expect(key.MCP_PUBLIC_URL).toBe('http://192.168.1.50:4774');
  });

  it("accepts '1' as well as 'true' for the flag, matching how the SDK reads it", async () => {
    const key = await reimportWith({ MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL: '1' }, '10.0.0.7');
    expect(key.MCP_PUBLIC_URL).toBe('http://10.0.0.7:4774');
  });

  it('falls back to loopback when the machine has no external IPv4', async () => {
    const key = await reimportWith({ MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL: 'true' });
    expect(key.MCP_PUBLIC_URL).toBe('http://localhost:4774');
  });

  it('lets an explicit MCP_PUBLIC_URL win — the TLS case', async () => {
    const key = await reimportWith(
      { MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL: 'true', MCP_PUBLIC_URL: 'https://nexoral.lan:4774' },
      '192.168.1.50',
    );
    expect(key.MCP_PUBLIC_URL).toBe('https://nexoral.lan:4774');
  });
});
