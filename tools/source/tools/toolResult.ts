import { CallToolResult, ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ApiResult } from "../client/types";

export function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], isError };
}

/**
 * The Streamable HTTP transport is configured in stateful mode (see index.ts),
 * so every request handled after initialization carries a session ID —
 * its absence indicates a transport misconfiguration, not user input.
 */
export function requireSessionId(extra: RequestHandlerExtra<ServerRequest, ServerNotification>): string {
  if (!extra.sessionId) {
    throw new Error("MCP session ID missing — transport is not running in stateful mode");
  }
  return extra.sessionId;
}

/** Converts a REST `ApiResult` into an MCP tool result, uniformly for every tool. */
export function fromApiResult<T>(result: ApiResult<T>): CallToolResult {
  if (!result.ok) {
    return textResult(`Error (${result.statusCode}): ${result.message}`, true);
  }
  return textResult(JSON.stringify({ message: result.message, data: result.data }, null, 2));
}

/** Builds a `?a=1&b=2` query string, skipping undefined values — shared by every list/filter tool. */
export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
