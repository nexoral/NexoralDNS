export interface McpUserSession {
  username: string;
  accessToken: string;
  refreshToken: string;
}

export interface ISessionStore {
  get(mcpSessionId: string): McpUserSession | undefined;
  set(mcpSessionId: string, session: McpUserSession): void;
  updateTokens(mcpSessionId: string, accessToken: string, refreshToken: string): void;
  clear(mcpSessionId: string): void;
}

/**
 * Per-MCP-session token bookkeeping. Keyed by the MCP transport's session ID
 * (one entry per connected LLM client), never persisted — a restart of this
 * process logs every connected MCP client out, which is an accepted v1
 * limitation since no DB/Redis is used by this module.
 */
class McpSessionStore implements ISessionStore {
  private readonly sessions = new Map<string, McpUserSession>();

  public get(mcpSessionId: string): McpUserSession | undefined {
    return this.sessions.get(mcpSessionId);
  }

  public set(mcpSessionId: string, session: McpUserSession): void {
    this.sessions.set(mcpSessionId, session);
  }

  public updateTokens(mcpSessionId: string, accessToken: string, refreshToken: string): void {
    const existing = this.sessions.get(mcpSessionId);
    if (!existing) return;
    existing.accessToken = accessToken;
    existing.refreshToken = refreshToken;
  }

  public clear(mcpSessionId: string): void {
    this.sessions.delete(mcpSessionId);
  }
}

export default new McpSessionStore();
