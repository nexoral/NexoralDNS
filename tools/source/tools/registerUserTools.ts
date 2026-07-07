import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId, buildQuery } from "./toolResult";

const PERMISSION_NOTE = "Requires the Full Access or Manage Users permission.";

export default function registerUserTools(server: McpServer): void {
  server.registerTool(
    "list_users",
    {
      title: "List users",
      description: `List all dashboard user accounts. ${PERMISSION_NOTE}`,
      inputSchema: {
        skip: z.number().int().min(0).optional().describe("Number of records to skip (default 0)"),
        limit: z.number().int().min(1).optional().describe("Maximum number of records to return (default 50)"),
      },
    },
    async ({ skip, limit }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/users${buildQuery({ skip, limit })}`)),
  );

  server.registerTool(
    "get_user",
    {
      title: "Get user",
      description: `Get a single dashboard user account by ID. ${PERMISSION_NOTE}`,
      inputSchema: { userId: z.string().describe("The user's ID") },
    },
    async ({ userId }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/users/${encodeURIComponent(userId)}`)),
  );

  server.registerTool(
    "create_user",
    {
      title: "Create user",
      description: `Create a new dashboard user with a temporary password (forces a password change on first login). ${PERMISSION_NOTE}`,
      inputSchema: {
        username: z.string().describe("Username for the new user"),
        password: z.string().describe("Temporary password for the new user"),
        roleId: z.string().describe("The role ID to assign to the new user"),
      },
    },
    async ({ username, password, roleId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/users", {
          method: "POST",
          body: { username, password, roleId },
        }),
      ),
  );

  server.registerTool(
    "update_user",
    {
      title: "Update user",
      description: `Update a user's username, role, or active status. Only the provided fields are changed. ${PERMISSION_NOTE}`,
      inputSchema: {
        userId: z.string().describe("The user's ID"),
        username: z.string().optional().describe("New username"),
        roleId: z.string().optional().describe("New role ID"),
        isActive: z.boolean().optional().describe("Whether the account is active"),
      },
    },
    async ({ userId, username, roleId, isActive }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/users/${encodeURIComponent(userId)}`, {
          method: "PUT",
          body: { username, roleId, isActive },
        }),
      ),
  );

  server.registerTool(
    "reset_user_password",
    {
      title: "Reset user password",
      description: `Reset a user's password to a new temporary one and force a change on next login. ${PERMISSION_NOTE}`,
      inputSchema: {
        userId: z.string().describe("The user's ID"),
        newPassword: z.string().describe("The new temporary password"),
      },
    },
    async ({ userId, newPassword }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/users/${encodeURIComponent(userId)}/reset-password`, {
          method: "PATCH",
          body: { newPassword },
        }),
      ),
  );

  server.registerTool(
    "delete_user",
    {
      title: "Delete user",
      description: `Delete a dashboard user account. ${PERMISSION_NOTE}`,
      inputSchema: { userId: z.string().describe("The user's ID") },
    },
    async ({ userId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/users/${encodeURIComponent(userId)}`, { method: "DELETE" }),
      ),
  );
}
