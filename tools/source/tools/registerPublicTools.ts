import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { textResult, fromApiResult, requireSessionId } from "./toolResult";

/** Tools that hit `server/`'s info/health/service endpoints. */
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

  server.registerTool(
    "get_service_info",
    {
      title: "Get service info",
      description:
        "Get runtime service information (server IP, DNS port, service status, version, web interface details). " +
        "Unlike get_server_info and check_server_health, this one requires login.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/service-info")),
  );
}
