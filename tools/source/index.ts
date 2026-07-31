import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import express, { NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { LOGIN_PATH, MCP_PATH, MCP_PUBLIC_URL, MCP_SERVER_INFO, ToolsKeys } from "./core/key";
import oauthProvider from "./auth/NexoralOAuthProvider";
import renderLoginPage from "./auth/loginPage";
import registerAllTools from "./tools/index";
import logger from "./utilities/logger";

const transports = new Map<string, StreamableHTTPServerTransport>();

const RESOURCE_URL = new URL(`${MCP_PUBLIC_URL}${MCP_PATH}`);
const RESOURCE_METADATA_URL = `${MCP_PUBLIC_URL}/.well-known/oauth-protected-resource${MCP_PATH}`;

/**
 * Host header allowlist for this machine, computed once at startup — this is
 * the DNS-rebinding mitigation the MCP SDK recommends implementing as
 * external middleware rather than via its (deprecated) built-in options.
 */
function discoverAllowedHosts(port: number): Set<string> {
  const hosts = new Set<string>([`localhost:${port}`, `127.0.0.1:${port}`, new URL(MCP_PUBLIC_URL).host]);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        hosts.add(`${address.address}:${port}`);
      }
    }
  }
  return hosts;
}

const allowedHosts = discoverAllowedHosts(ToolsKeys.PORT);

function hostGuard(req: Request, res: Response, next: NextFunction): void {
  if (req.headers.host && allowedHosts.has(req.headers.host)) {
    next();
    return;
  }
  logger.warn(`[MCP] rejected request: unrecognized Host header "${req.headers.host}"`);
  res.status(421).type("text/plain").send("Misdirected Request: unrecognized Host header");
}

function buildMcpServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO);
  registerAllTools(server);
  return server;
}

function sendJsonRpcError(res: Response, status: number, message: string): void {
  res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

/** Never log raw credentials — blanks any argument key that looks password-like. */
function sanitizeArgs(args: unknown): unknown {
  if (!args || typeof args !== "object") return args;
  const clone: Record<string, unknown> = { ...(args as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/password/i.test(key)) clone[key] = "[redacted]";
  }
  return clone;
}

/** One-line description of an incoming JSON-RPC call for the request log. */
function describeJsonRpcBody(body: unknown): { summary: string; toolArgs?: unknown } {
  if (!body || typeof body !== "object") return { summary: "(no body)" };
  const { method, params } = body as { method?: string; params?: { name?: string; arguments?: unknown } };
  if (method === "tools/call" && params?.name) {
    return { summary: `tools/call → ${params.name}`, toolArgs: sanitizeArgs(params.arguments) };
  }
  return { summary: method ?? "(unknown method)" };
}

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const body = req.method === "POST" ? (req.body as unknown) : undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId) as StreamableHTTPServerTransport;

    if (req.method === "POST") {
      const { summary, toolArgs } = describeJsonRpcBody(body);
      logger.info(`[MCP] session ${sessionId} — ${summary}`, toolArgs);
    } else {
      logger.info(`[MCP] session ${sessionId} — ${req.method} stream`);
    }

    await transport.handleRequest(req, res, body);
    return;
  }

  if (req.method === "POST" && !sessionId && isInitializeRequest(body)) {
    let transport: StreamableHTTPServerTransport;
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        logger.info(`[MCP] session ${id} initialized`);
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        logger.info(`[MCP] session ${transport.sessionId} closed`);
      }
    };

    const server = buildMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  logger.warn(`[MCP] rejected request: no valid session ID (method=${req.method})`);
  sendJsonRpcError(res, 400, "Bad Request: No valid session ID provided");
}

const app = express();
app.use(hostGuard);

// Mounts /authorize, /token, /register, /revoke and both discovery documents.
app.use(
  mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl: new URL(MCP_PUBLIC_URL),
    resourceServerUrl: RESOURCE_URL,
    resourceName: "NexoralDNS",
  }),
);

app.get(LOGIN_PATH, (req, res) => {
  const requestId = String(req.query.request ?? "");
  const clientName = oauthProvider.clientNameFor(requestId);
  if (!clientName) {
    res.status(400).type("text/plain").send("This login request has expired — start again from your MCP client.");
    return;
  }
  res.type("html").send(renderLoginPage(requestId, clientName));
});

app.post(LOGIN_PATH, express.urlencoded({ extended: false }), (req, res, next) => {
  const { request, username, password } = req.body as Record<string, string | undefined>;
  const requestId = String(request ?? "");

  oauthProvider
    .completeLogin(requestId, String(username ?? ""), String(password ?? ""))
    .then((result) => {
      if ("redirectTo" in result) {
        res.redirect(result.redirectTo);
        return;
      }
      const clientName = oauthProvider.clientNameFor(requestId);
      if (!clientName) {
        res.status(400).type("text/plain").send(result.error);
        return;
      }
      res.status(401).type("html").send(renderLoginPage(requestId, clientName, result.error));
    })
    .catch(next);
});

app.all(
  MCP_PATH,
  requireBearerAuth({ verifier: oauthProvider, resourceMetadataUrl: RESOURCE_METADATA_URL }),
  express.json(),
  (req, res) => {
    handleMcpRequest(req, res).catch((error: unknown) => {
      logger.error("[MCP] request failed", error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, "Internal server error");
      }
    });
  },
);

const httpServer = app.listen(ToolsKeys.PORT, ToolsKeys.HOST, () => {
  logger.info(`NexoralDNS MCP tool server listening on ${MCP_PUBLIC_URL}${MCP_PATH}`);
});

function shutdown(): void {
  httpServer.close();
  for (const transport of transports.values()) {
    void transport.close();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
