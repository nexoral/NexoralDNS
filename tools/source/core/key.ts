import { networkInterfaces } from "node:os";

export enum ToolsKeys {
  PORT = 4774,
  HOST = "0.0.0.0",
  API_BASE_URL = "http://127.0.0.1:4773/api",
}

export const MCP_SERVER_INFO = {
  name: "nexoraldns-mcp-tools",
  version: "1.0.0",
};

/**
 * Set when the operator has accepted plain http on the LAN (the SDK reads the
 * same variable to relax its HTTPS-issuer rule). Read here only to pick a
 * sensible default origin below — the SDK's own check is what actually enforces it.
 */
const ALLOW_INSECURE_ISSUER =
  process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL === "true" ||
  process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL === "1";

/** First non-internal IPv4 of this machine, or undefined if it has none. */
function detectLanAddress(): string | undefined {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return undefined;
}

/**
 * The origin MCP clients actually connect to. It is baked into the OAuth
 * metadata documents, so it MUST match the URL configured in the client or
 * discovery fails.
 *
 * Defaults to loopback, the only host OAuth 2.1 permits over plain http — so a
 * same-machine client works with no configuration. Once the operator opts into
 * insecure LAN access, the machine's own LAN address is detected automatically,
 * because that is the only origin a second device could reach. An explicit
 * MCP_PUBLIC_URL always wins, and is what you set when fronting this with TLS.
 */
export const MCP_PUBLIC_URL =
  process.env.MCP_PUBLIC_URL ??
  (ALLOW_INSECURE_ISSUER
    ? `http://${detectLanAddress() ?? "localhost"}:${ToolsKeys.PORT}`
    : `http://localhost:${ToolsKeys.PORT}`);

export const MCP_PATH = "/mcp";
export const LOGIN_PATH = "/login";

/** Mirrors the access_token cookie maxAge in server/'s Login.service. */
export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
