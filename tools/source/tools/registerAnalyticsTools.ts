import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, textResult, requireSessionId, buildQuery } from "./toolResult";

const logFilterFields = {
  SourceIP: z.string().optional().describe("Filter by source IP address"),
  queryName: z.string().optional().describe("Filter by query name/domain"),
  from: z.number().optional().describe("Start timestamp (milliseconds)"),
  to: z.number().optional().describe("End timestamp (milliseconds)"),
  Status: z.string().optional().describe("Filter by DNS query status (e.g. RESOLVED, BLOCKED)"),
  durationFrom: z.number().optional().describe("Minimum query duration (milliseconds)"),
  durationTo: z.number().optional().describe("Maximum query duration (milliseconds)"),
};

export default function registerAnalyticsTools(server: McpServer): void {
  server.registerTool(
    "get_dashboard_analytics",
    {
      title: "Get dashboard analytics",
      description: "Fetch aggregated analytics data for the dashboard overview.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/analytics/get-dashboard-data")),
  );

  server.registerTool(
    "get_logs",
    {
      title: "Get DNS query logs",
      description: "Fetch paginated DNS query logs, optionally filtered by IP, domain, status, time range, or duration.",
      inputSchema: {
        ...logFilterFields,
        limit: z.number().int().min(1).optional().describe("Records per page (default 10)"),
        page: z.number().int().min(1).optional().describe("Page number (default 1)"),
      },
    },
    async ({ limit, page, ...filters }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/analytics/get-logs${buildQuery({ ...filters, limit, page })}`),
      ),
  );

  server.registerTool(
    "request_log_export",
    {
      title: "Request log export",
      description:
        "Queue an asynchronous export of DNS query logs (matching the given filters) as a text file. " +
        "Poll get_log_export_status, then fetch the result with download_log_export. " +
        "Requires the Full Access or View Logs permission.",
      inputSchema: {
        format: z.literal("txt").describe("Export file format (only 'txt' is supported)"),
        ...logFilterFields,
      },
    },
    async ({ format, ...filters }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/analytics/export-logs", {
          method: "POST",
          body: { format, ...filters },
        }),
      ),
  );

  server.registerTool(
    "get_log_export_status",
    {
      title: "Get log export status",
      description:
        "Check the status of the current log export job requested via request_log_export. " +
        "Requires the Full Access or View Logs permission.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/analytics/export-logs/status")),
  );

  server.registerTool(
    "download_log_export",
    {
      title: "Download log export",
      description:
        "Download the completed log export file requested via request_log_export. " +
        "Deletes the file from the server and clears the export job afterward. Large exports are truncated. " +
        "Requires the Full Access or View Logs permission.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const result = await apiClient.downloadLogExport(requireSessionId(extra));
      if (!result.ok) {
        return textResult(`Error (${result.statusCode}): ${result.message}`, true);
      }
      return textResult(result.data ?? "");
    },
  );
}
