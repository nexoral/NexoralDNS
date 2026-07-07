import { ToolsKeys } from "../core/key";
import { ApiResult, parseEnvelope } from "./types";

export interface HealthPayload {
  status: "ok" | "unhealthy";
  timestamp: string;
  details: Record<string, string>;
}

export interface IHealthMonitor {
  /** Direct, uncached GET /api/health call. */
  checkHealth(): Promise<ApiResult<HealthPayload>>;
  /** Cached gate check — returns an error message if unhealthy, null if healthy. */
  ensureHealthy(): Promise<string | null>;
}

const HEALTH_CACHE_TTL_MS = 3000;
const HEALTH_CHECK_TIMEOUT_MS = 3000;

/**
 * Monitors `server/`'s health independently of any single REST call — this is
 * a distinct reason to change from "how do we call the DNS/domain endpoints"
 * (ApiClient's job), so it's split out rather than folded into ApiClient.
 */
export default class HealthMonitor implements IHealthMonitor {
  private cache: { checkedAt: number; error: string | null } | null = null;

  public async checkHealth(): Promise<ApiResult<HealthPayload>> {
    try {
      const response = await fetch(`${ToolsKeys.API_BASE_URL}/health`, {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      return await parseEnvelope<HealthPayload>(response);
    } catch (error) {
      return {
        ok: false,
        statusCode: 503,
        message: `NexoralDNS server is unreachable: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  public async ensureHealthy(): Promise<string | null> {
    const now = Date.now();
    if (this.cache && now - this.cache.checkedAt < HEALTH_CACHE_TTL_MS) {
      return this.cache.error;
    }

    const result = await this.checkHealth();
    const error = result.ok && result.data?.status === "ok"
      ? null
      : `NexoralDNS server is not healthy (${result.message}) — operations are unavailable until it recovers`;

    this.cache = { checkedAt: now, error };
    return error;
  }
}
