import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId, buildQuery } from "./toolResult";

const PERMISSION_NOTE = "Requires the Full Access or Manage Roles permission.";

export default function registerRoleTools(server: McpServer): void {
  server.registerTool(
    "list_permissions",
    {
      title: "List permissions",
      description: `List the fixed catalog of permission codes roles can be granted. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/roles/permissions")),
  );

  server.registerTool(
    "list_roles",
    {
      title: "List roles",
      description: `List all roles with their permissions populated. ${PERMISSION_NOTE}`,
      inputSchema: {
        skip: z.number().int().min(0).optional().describe("Number of records to skip (default 0)"),
        limit: z.number().int().min(1).optional().describe("Maximum number of records to return (default 50)"),
      },
    },
    async ({ skip, limit }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/roles${buildQuery({ skip, limit })}`)),
  );

  server.registerTool(
    "get_role",
    {
      title: "Get role",
      description: `Get a single role by ID. ${PERMISSION_NOTE}`,
      inputSchema: { roleId: z.string().describe("The role's ID") },
    },
    async ({ roleId }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/roles/${encodeURIComponent(roleId)}`)),
  );

  server.registerTool(
    "create_role",
    {
      title: "Create role",
      description: `Create a new role from a chosen set of permission codes (see list_permissions for the catalog). ${PERMISSION_NOTE}`,
      inputSchema: {
        name: z.string().describe("Role name"),
        permissionCodes: z.array(z.number().int()).describe("List of permission codes to grant this role"),
      },
    },
    async ({ name, permissionCodes }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/roles", {
          method: "POST",
          body: { name, permissionCodes },
        }),
      ),
  );

  server.registerTool(
    "update_role",
    {
      title: "Update role",
      description: `Update a role's name and/or permission codes. Only the provided fields are changed. ${PERMISSION_NOTE}`,
      inputSchema: {
        roleId: z.string().describe("The role's ID"),
        name: z.string().optional().describe("New role name"),
        permissionCodes: z.array(z.number().int()).optional().describe("New list of permission codes"),
      },
    },
    async ({ roleId, name, permissionCodes }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/roles/${encodeURIComponent(roleId)}`, {
          method: "PUT",
          body: { name, permissionCodes },
        }),
      ),
  );

  server.registerTool(
    "delete_role",
    {
      title: "Delete role",
      description: `Delete a role. Rejected if any user is still assigned to it. ${PERMISSION_NOTE}`,
      inputSchema: { roleId: z.string().describe("The role's ID") },
    },
    async ({ roleId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/roles/${encodeURIComponent(roleId)}`, { method: "DELETE" }),
      ),
  );
}
