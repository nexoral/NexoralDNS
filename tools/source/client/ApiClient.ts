import { ToolsKeys } from "../core/key";
import HealthMonitor, { IHealthMonitor, HealthPayload } from "./HealthMonitor";
import { ApiResult, parseEnvelope } from "./types";

const MAX_DOWNLOAD_CHARS = 200_000;

interface FetchError {
  statusCode: number;
  message: string;
}

/**
 * Thin HTTP client for the existing NexoralDNS REST API (server/, port 4773).
 *
 * It holds no session state of its own: the OAuth access token arrives with
 * each MCP request, has already been verified against `server/` by the bearer
 * middleware, and is simply replayed as the `access_token` cookie. Token
 * refresh is the MCP client's job via the OAuth refresh grant — a 401 here
 * propagates up so the transport can answer with one.
 *
 * Depends on the `IHealthMonitor` abstraction (constructor-injected below at
 * the composition point), not a concrete implementation — so it can be swapped
 * for a fake in isolation, without a full DI container, which would be overkill
 * for a module with no Mongo/Redis/RabbitMQ of its own.
 */
export class ApiClient {
  constructor(private readonly health: IHealthMonitor) {}

  /** Direct, uncached health check — exposed as its own tool for an LLM to check proactively. */
  public checkHealth(): Promise<ApiResult<HealthPayload>> {
    return this.health.checkHealth();
  }

  /** Public, unauthenticated GET /api/info — no token/health gate needed. */
  public async getServerInfo(): Promise<ApiResult<unknown>> {
    const response = await fetch(`${ToolsKeys.API_BASE_URL}/info`);
    return parseEnvelope(response);
  }

  /** Authenticated call against the REST API on behalf of the token's owner. */
  public async request<T>(
    accessToken: string,
    path: string,
    init: { method: string; body?: unknown } = { method: "GET" },
  ): Promise<ApiResult<T>> {
    const response = await this.authenticatedFetch(accessToken, path, init);
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
  public async downloadLogExport(accessToken: string): Promise<ApiResult<string>> {
    const response = await this.authenticatedFetch(accessToken, "/analytics/export-logs/download");
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
   * Shared request path for every authenticated call: health gate, then the
   * call itself. Returns either the raw Response (caller decides how to parse
   * the body) or a typed error.
   */
  private async authenticatedFetch(
    accessToken: string,
    path: string,
    init: { method: string; body?: unknown } = { method: "GET" },
  ): Promise<Response | FetchError> {
    const healthIssue = await this.health.ensureHealthy();
    if (healthIssue) return { statusCode: 503, message: healthIssue };

    return fetch(`${ToolsKeys.API_BASE_URL}${path}`, {
      method: init.method,
      // Only send Content-Type: application/json when there's an actual body —
      // server/'s custom content-type parser calls JSON.parse on whatever bytes
      // arrive whenever this header is present, so sending it on a bodyless
      // DELETE/PATCH call fails with "Unexpected end of JSON input" on an empty string.
      headers: init.body !== undefined
        ? { "Content-Type": "application/json", Cookie: `access_token=${accessToken}` }
        : { Cookie: `access_token=${accessToken}` },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  }
}

export default new ApiClient(new HealthMonitor());
