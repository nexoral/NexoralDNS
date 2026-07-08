import { describe, it, expect } from 'vitest';
import { ToolsKeys, MCP_SERVER_INFO } from '@tools/source/core/key';

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
