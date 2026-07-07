import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { textResult } from "./toolResult";

/** Tools that hit `server/`'s public, unauthenticated endpoints — no login required. */
export default function registerPublicTools(server: McpServer): void {
  server.registerTool(
    "get_server_info",
    {
      title: "Get server info",
      description: "Get public information about the NexoralDNS server. Does not require login.",
      inputSchema: {},
    },
    async () => {
      const result = await apiClient.getServerInfo();
      if (!result.ok) return textResult(`Error (${result.statusCode}): ${result.message}`, true);
      return textResult(JSON.stringify({ message: result.message, data: result.data }, null, 2));
    },
  );

  server.registerTool(
    "check_server_health",
    {
      title: "Check server health",
      description:
        "Check whether the NexoralDNS server and its dependencies (MongoDB, Redis, RabbitMQ) are healthy. " +
        "Does not require login — useful to diagnose why other tools are failing.",
      inputSchema: {},
    },
    async () => {
      const result = await apiClient.checkHealth();
      return textResult(JSON.stringify({ message: result.message, data: result.data }, null, 2), !result.ok);
    },
  );
}
