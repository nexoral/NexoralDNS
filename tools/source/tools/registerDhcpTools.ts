import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId } from "./toolResult";

export default function registerDhcpTools(server: McpServer): void {
  server.registerTool(
    "list_connected_ips",
    {
      title: "List connected IPs",
      description: "List all IP addresses currently connected to the DHCP-managed router/network.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/dhcp/list-of-available-ips")),
  );

  server.registerTool(
    "refresh_connected_ips",
    {
      title: "Refresh connected IPs",
      description:
        "Refresh the list of connected IP addresses by re-querying the router. " +
        "Requires the Full Access or Refresh Connected IPs permission.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/dhcp/refresh-connected-ips")),
  );
}
