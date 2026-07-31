import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireAuthToken } from "./toolResult";

/**
 * No login/logout tools: authentication happens in the browser via the OAuth
 * flow (see auth/NexoralOAuthProvider), so credentials never reach the LLM or
 * the conversation. Clients end a session through the OAuth revocation
 * endpoint, which is wired to `server/`'s logout.
 */
export default function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "change_password",
    {
      title: "Change password",
      description: "Change the password of the currently logged-in account.",
      inputSchema: {
        currentPassword: z.string().describe("The account's current password"),
        newPassword: z.string().min(6).describe("The new password (minimum 6 characters)"),
      },
    },
    async ({ currentPassword, newPassword }, extra) =>
      fromApiResult(
        await apiClient.request(requireAuthToken(extra), "/auth/change-password", {
          method: "POST",
          body: { currentPassword, newPassword },
        }),
      ),
  );

  server.registerTool(
    "verify_session",
    {
      title: "Verify session",
      description: "Verify the current session is still valid and return the logged-in user's details and permissions.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireAuthToken(extra), "/auth/verify")),
  );
}
