import { ToolsKeys } from "../core/key";
import sessionStoreSingleton, { ISessionStore, McpUserSession } from "../session/McpSessionStore";
import HealthMonitor, { IHealthMonitor, HealthPayload } from "./HealthMonitor";
import { ApiResult, parseEnvelope } from "./types";
import logger from "../utilities/logger";

const MAX_DOWNLOAD_CHARS = 200_000;

interface FetchError {
  statusCode: number;
  message: string;
}

/**
 * Parses the two auth cookies out of a fetch Response's Set-Cookie headers.
 * `server/`'s login/refresh endpoints only ever deliver tokens this way —
 * never in the JSON body — so this is the sole extraction point.
 */
function extractTokens(response: Response): { accessToken?: string; refreshToken?: string } {
  const cookies = response.headers.getSetCookie();
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [name, value] = pair.split("=");
    if (name.trim() === "access_token") accessToken = value;
    if (name.trim() === "refresh_token") refreshToken = value;
  }

  return { accessToken, refreshToken };
}

function cookieHeader(session: McpUserSession): string {
  return `access_token=${session.accessToken}; refresh_token=${session.refreshToken}`;
}

/**
 * Thin HTTP client for the existing NexoralDNS REST API (server/, port 4773).
 * Depends on `IHealthMonitor`/`ISessionStore` abstractions (constructor-injected
 * below at the composition point), not concrete implementations — so either
 * can be swapped for a fake in isolation, without a full DI container, which
 * would be overkill for a module with no Mongo/Redis/RabbitMQ of its own.
 */
class ApiClient {
  constructor(
    private readonly health: IHealthMonitor,
    private readonly sessions: ISessionStore,
  ) {}

  /** Direct, uncached health check — exposed as its own tool for an LLM to check proactively. */
  public checkHealth(): Promise<ApiResult<HealthPayload>> {
    return this.health.checkHealth();
  }

  /** Public, unauthenticated GET /api/info — no session/health gate needed. */
  public async getServerInfo(): Promise<ApiResult<unknown>> {
    const response = await fetch(`${ToolsKeys.API_BASE_URL}/info`);
    return parseEnvelope(response);
  }

  public async login(mcpSessionId: string, username: string, password: string): Promise<ApiResult<{ user: { username: string } }>> {
    const healthIssue = await this.health.ensureHealthy();
    if (healthIssue) {
      logger.warn(`[Auth] login blocked by health gate (session ${mcpSessionId})`, healthIssue);
      return { ok: false, statusCode: 503, message: healthIssue, data: null };
    }

    const response = await fetch(`${ToolsKeys.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await parseEnvelope<{ user: { username: string } }>(response);
    if (!response.ok) {
      logger.warn(`[Auth] login failed for "${username}" (session ${mcpSessionId}): ${result.message}`);
      return result;
    }

    const { accessToken, refreshToken } = extractTokens(response);
    if (!accessToken || !refreshToken) {
      logger.error(`[Auth] login succeeded for "${username}" but no session tokens were issued`);
      return { ok: false, statusCode: 500, message: "Login succeeded but no session tokens were issued", data: null };
    }

    this.sessions.set(mcpSessionId, { username, accessToken, refreshToken });
    logger.info(`[Auth] "${username}" logged in (session ${mcpSessionId})`);
    return result;
  }

  public async logout(mcpSessionId: string): Promise<void> {
    const session = this.sessions.get(mcpSessionId);
    if (session) {
      await fetch(`${ToolsKeys.API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookieHeader(session) },
      }).catch(() => undefined);
      logger.info(`[Auth] "${session.username}" logged out (session ${mcpSessionId})`);
    }
    this.sessions.clear(mcpSessionId);
  }

  /**
   * Authenticated call against the REST API on behalf of the given MCP session.
   * Retries once after a silent token refresh if the first attempt gets a 401.
   */
  public async request<T>(
    mcpSessionId: string,
    path: string,
    init: { method: string; body?: unknown } = { method: "GET" },
  ): Promise<ApiResult<T>> {
    const response = await this.authenticatedFetch(mcpSessionId, path, init);
    if ("statusCode" in response) {
      return { ok: false, statusCode: response.statusCode, message: response.message, data: null };
    }
    return parseEnvelope<T>(response);
  }

  /**
   * Downloads a completed log export. Unlike every other endpoint, a successful
   * response here is a raw text file (`Content-Type: text/plain`), not the
   * standard JSON envelope — only the error path returns JSON.
   */
  public async downloadLogExport(mcpSessionId: string): Promise<ApiResult<string>> {
    const response = await this.authenticatedFetch(mcpSessionId, "/analytics/export-logs/download");
    if ("statusCode" in response) {
      return { ok: false, statusCode: response.statusCode, message: response.message, data: null };
    }

    if (!response.ok || (response.headers.get("content-type") ?? "").includes("application/json")) {
      return parseEnvelope<string>(response);
    }

    const text = await response.text();
    const truncated = text.length > MAX_DOWNLOAD_CHARS;
    return {
      ok: true,
      statusCode: response.status,
      message: truncated ? `Export truncated to ${MAX_DOWNLOAD_CHARS} characters` : "Export downloaded",
      data: truncated ? text.slice(0, MAX_DOWNLOAD_CHARS) : text,
    };
  }

  /**
   * Shared request path for every authenticated call: health gate, session
   * lookup, and one 401-triggered refresh + retry. Returns either the raw
   * Response (caller decides how to parse the body) or a typed error.
   */
  private async authenticatedFetch(
    mcpSessionId: string,
    path: string,
    init: { method: string; body?: unknown } = { method: "GET" },
  ): Promise<Response | FetchError> {
    const healthIssue = await this.health.ensureHealthy();
    if (healthIssue) return { statusCode: 503, message: healthIssue };

    const session = this.sessions.get(mcpSessionId);
    if (!session) return { statusCode: 401, message: "Not logged in — call the login tool first" };

    const doRequest = async (activeSession: McpUserSession): Promise<Response> =>
      fetch(`${ToolsKeys.API_BASE_URL}${path}`, {
        method: init.method,
        // Only send Content-Type: application/json when there's an actual body —
        // server/'s custom content-type parser calls JSON.parse on whatever bytes
        // arrive whenever this header is present, so sending it on a bodyless
        // DELETE/PATCH call fails with "Unexpected end of JSON input" on an empty string.
        headers: init.body !== undefined
          ? { "Content-Type": "application/json", Cookie: cookieHeader(activeSession) }
          : { Cookie: cookieHeader(activeSession) },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });

    let response = await doRequest(session);

    if (response.status === 401) {
      const refreshed = await this.refresh(mcpSessionId);
      if (!refreshed) return { statusCode: 401, message: "Session expired — call the login tool again" };
      response = await doRequest(this.sessions.get(mcpSessionId) as McpUserSession);
    }

    return response;
  }

  private async refresh(mcpSessionId: string): Promise<boolean> {
    const session = this.sessions.get(mcpSessionId);
    if (!session) return false;

    const response = await fetch(`${ToolsKeys.API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { Cookie: cookieHeader(session) },
    });
    if (!response.ok) return false;

    const { accessToken, refreshToken } = extractTokens(response);
    if (!accessToken || !refreshToken) return false;

    this.sessions.updateTokens(mcpSessionId, accessToken, refreshToken);
    return true;
  }
}

export default new ApiClient(new HealthMonitor(), sessionStoreSingleton);
