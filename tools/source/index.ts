import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { ToolsKeys, MCP_SERVER_INFO } from "./core/key";
import registerAllTools from "./tools/index";
import logger from "./utilities/logger";

const MCP_PATH = "/mcp";
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Host header allowlist for this machine, computed once at startup — this is
 * the DNS-rebinding mitigation the MCP SDK recommends implementing as
 * external middleware rather than via its (deprecated) built-in options.
 */
function discoverAllowedHosts(port: number): Set<string> {
  const hosts = new Set<string>([`localhost:${port}`, `127.0.0.1:${port}`]);
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

function isAllowedHost(req: IncomingMessage): boolean {
  const host = req.headers.host;
  return !!host && allowedHosts.has(host);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function buildMcpServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO);
  registerAllTools(server);
  return server;
}

function sendJsonRpcError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "Content-Type": "application/json" }).end(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }),
  );
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

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId) as StreamableHTTPServerTransport;
    const body = req.method === "POST" ? await readJsonBody(req) : undefined;

    if (req.method === "POST") {
      const { summary, toolArgs } = describeJsonRpcBody(body);
      logger.info(`[MCP] session ${sessionId} — ${summary}`, toolArgs);
    } else {
      logger.info(`[MCP] session ${sessionId} — ${req.method} stream`);
    }

    await transport.handleRequest(req, res, body);
    return;
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    if (!sessionId && isInitializeRequest(body)) {
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
  }

  logger.warn(`[MCP] rejected request: no valid session ID (method=${req.method})`);
  sendJsonRpcError(res, 400, "Bad Request: No valid session ID provided");
}

const httpServer = createServer((req, res) => {
  if (req.url !== MCP_PATH) {
    res.writeHead(404).end();
    return;
  }
  if (!isAllowedHost(req)) {
    logger.warn(`[MCP] rejected request: unrecognized Host header "${req.headers.host}"`);
    res.writeHead(421, { "Content-Type": "text/plain" }).end("Misdirected Request: unrecognized Host header");
    return;
  }

  handleMcpRequest(req, res).catch((error: unknown) => {
    logger.error("[MCP] request failed", error);
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, "Internal server error");
    }
  });
});

httpServer.listen(ToolsKeys.PORT, ToolsKeys.HOST, () => {
  logger.info(`NexoralDNS MCP tool server listening on http://${ToolsKeys.HOST}:${ToolsKeys.PORT}${MCP_PATH}`);
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
