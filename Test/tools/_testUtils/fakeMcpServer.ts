import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** A registered tool captured by the fake server. */
export interface CapturedTool {
  name: string;
  config: {
    title?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  };
  handler: (args: any, extra: any) => Promise<any> | any;
}

export interface CapturedServer {
  server: McpServer;
  tools: Map<string, CapturedTool>;
  /** Invoke a registered tool's handler with the given args and an MCP session id. */
  call(name: string, args: Record<string, unknown>, sessionId?: string): Promise<any>;
}

/**
 * A stand-in for `McpServer` that records every `registerTool(name, config, handler)`
 * call instead of wiring it into a real transport. Lets us assert which tools a
 * `register*` module declares and drive each tool's handler in isolation — the
 * register modules only ever use `McpServer` as a type, so no real SDK server
 * (or transport) is needed at runtime.
 */
export function captureTools(): CapturedServer {
  const tools = new Map<string, CapturedTool>();

  const server = {
    registerTool(name: string, config: CapturedTool['config'], handler: CapturedTool['handler']) {
      tools.set(name, { name, config, handler });
    },
  } as unknown as McpServer;

  return {
    server,
    tools,
    call(name, args, sessionId = 'sess-test') {
      const tool = tools.get(name);
      if (!tool) throw new Error(`tool "${name}" was not registered`);
      return tool.handler(args, { sessionId });
    },
  };
}
