import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId, buildQuery } from "./toolResult";

const PERMISSION_NOTE = "Requires the Full Access or Configure Settings permission.";

export default function registerSettingsTools(server: McpServer): void {
  server.registerTool(
    "toggle_dns_service",
    {
      title: "Toggle DNS service",
      description: `Turn the DNS resolution service on or off. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/settings/toggle-service")),
  );

  server.registerTool(
    "get_default_ttl",
    {
      title: "Get default TTL",
      description: `Get the current default TTL (seconds) applied to blocked domains and forwarder requests. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/settings/default-ttl")),
  );

  server.registerTool(
    "update_default_ttl",
    {
      title: "Update default TTL",
      description: `Update the default TTL (seconds, 0-86400) applied to blocked domains and forwarder requests. ${PERMISSION_NOTE}`,
      inputSchema: {
        defaultTTL: z.number().min(0).max(86400).describe("New default TTL in seconds (0-86400)"),
      },
    },
    async ({ defaultTTL }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/settings/default-ttl", {
          method: "PUT",
          body: { defaultTTL },
        }),
      ),
  );

  server.registerTool(
    "get_cache_stats",
    {
      title: "Get cache stats",
      description: "Get statistics for all DNS caches.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/settings/get-cache-stat")),
  );

  server.registerTool(
    "delete_all_dns_cache",
    {
      title: "Delete all DNS cache",
      description: "Delete every cached DNS query result, forcing fresh lookups.",
      inputSchema: {},
    },
    async (_args, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), "/settings/delete-all-dns-cache", { method: "DELETE" })),
  );

  server.registerTool(
    "delete_specific_cache_key",
    {
      title: "Delete specific cache key",
      description: "Delete a single named DNS cache key.",
      inputSchema: {
        keyName: z.string().describe("The cache key name to delete"),
      },
    },
    async ({ keyName }, extra) =>
      fromApiResult(
        await apiClient.request(
          requireSessionId(extra),
          `/settings/delete-specific-cache-key${buildQuery({ keyName })}`,
          { method: "DELETE" },
        ),
      ),
  );
}
