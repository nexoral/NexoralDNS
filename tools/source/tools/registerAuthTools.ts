import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { textResult, fromApiResult, requireSessionId } from "./toolResult";

export default function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "login",
    {
      title: "Login",
      description:
        "Authenticate with the NexoralDNS dashboard using a username and password. " +
        "Must be called before any other tool — the permissions of the logged-in account " +
        "determine which operations you're allowed to perform.",
      inputSchema: {
        username: z.string().describe("NexoralDNS dashboard username"),
        password: z.string().describe("NexoralDNS dashboard password"),
      },
    },
    async ({ username, password }, extra) => {
      const result = await apiClient.login(requireSessionId(extra), username, password);
      if (!result.ok) {
        return textResult(`Login failed: ${result.message}`, true);
      }
      return textResult(`Logged in as ${username}.`);
    },
  );

  server.registerTool(
    "logout",
    {
      title: "Logout",
      description: "End the current NexoralDNS session started by the login tool.",
      inputSchema: {},
    },
    async (_args, extra) => {
      await apiClient.logout(requireSessionId(extra));
      return textResult("Logged out.");
    },
  );

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
        await apiClient.request(requireSessionId(extra), "/auth/change-password", {
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
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/auth/verify")),
  );
}
