import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId, buildQuery } from "./toolResult";

const PERMISSION_NOTE = "Requires the Full Access or Configure Settings permission.";

const domainEntry = z.union([
  z.string(),
  z.object({ domain: z.string(), isWildcard: z.boolean() }),
]);

const policyTypeEnum = z.enum(["user_domain", "user_internet", "domain_all", "domain_user", "group_based"]);
const targetTypeEnum = z.enum(["single_ip", "multiple_ips", "ip_group", "multiple_ip_groups", "all"]);
const blockTypeEnum = z.enum(["specific_domains", "domain_group", "multiple_domain_groups", "full_internet"]);

const policyFields = {
  targetIP: z.string().optional().describe("Target IP address (required when targetType is single_ip)"),
  targetIPs: z.array(z.string()).optional().describe("Target IP addresses (required when targetType is multiple_ips)"),
  targetIPGroup: z.string().optional().describe("Target IP group ID (required when targetType is ip_group)"),
  targetIPGroups: z.array(z.string()).optional().describe("Target IP group IDs (required when targetType is multiple_ip_groups)"),
  domains: z.array(domainEntry).optional().describe("Domains to block, string or {domain, isWildcard} (required when blockType is specific_domains)"),
  domainGroup: z.string().optional().describe("Domain group ID to block (required when blockType is domain_group)"),
  domainGroups: z.array(z.string()).optional().describe("Domain group IDs to block (required when blockType is multiple_domain_groups)"),
};

export default function registerAccessControlTools(server: McpServer): void {
  // ==================== Policies ====================

  server.registerTool(
    "create_access_policy",
    {
      title: "Create access control policy",
      description: `Create a new access control (blocking) policy targeting an IP/IP group and blocking domains/domain groups/full internet. ${PERMISSION_NOTE}`,
      inputSchema: {
        policyType: policyTypeEnum.describe("Type of policy"),
        targetType: targetTypeEnum.describe("What the policy targets"),
        blockType: blockTypeEnum.describe("What kind of blocking to apply"),
        policyName: z.string().describe("Name of the policy"),
        isActive: z.boolean().describe("Whether the policy is active"),
        ...policyFields,
      },
    },
    async ({ policyType, targetType, blockType, policyName, isActive, ...rest }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/access-control/policy", {
          method: "POST",
          body: { policyType, targetType, blockType, policyName, isActive, ...rest },
        }),
      ),
  );

  server.registerTool(
    "list_access_policies",
    {
      title: "List access control policies",
      description: `List access control policies, optionally filtered. ${PERMISSION_NOTE}`,
      inputSchema: {
        filter: z
          .enum(["all", "active", "inactive", "user_domain", "user_internet", "domain_all", "domain_user", "group_based"])
          .optional()
          .describe("Filter type (default all)"),
        skip: z.number().int().min(0).optional().describe("Number of records to skip (default 0)"),
        limit: z.number().int().min(1).optional().describe("Maximum number of records to return (default 50)"),
      },
    },
    async ({ filter, skip, limit }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/policies${buildQuery({ filter, skip, limit })}`),
      ),
  );

  server.registerTool(
    "get_access_policy",
    {
      title: "Get access control policy",
      description: `Get a single access control policy by ID. ${PERMISSION_NOTE}`,
      inputSchema: { policyId: z.string().describe("The policy's ID") },
    },
    async ({ policyId }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/access-control/policy/${encodeURIComponent(policyId)}`)),
  );

  server.registerTool(
    "update_access_policy",
    {
      title: "Update access control policy",
      description: `Update an access control policy. Only the provided fields are changed. ${PERMISSION_NOTE}`,
      inputSchema: {
        policyId: z.string().describe("The policy's ID"),
        policyType: policyTypeEnum.optional().describe("Type of policy"),
        targetType: targetTypeEnum.optional().describe("What the policy targets"),
        blockType: blockTypeEnum.optional().describe("What kind of blocking to apply"),
        policyName: z.string().optional().describe("Name of the policy"),
        isActive: z.boolean().optional().describe("Whether the policy is active"),
        ...policyFields,
      },
    },
    async ({ policyId, ...body }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/policy/${encodeURIComponent(policyId)}`, {
          method: "PUT",
          body,
        }),
      ),
  );

  server.registerTool(
    "toggle_access_policy",
    {
      title: "Toggle access control policy",
      description: `Flip an access control policy's active status. ${PERMISSION_NOTE}`,
      inputSchema: { policyId: z.string().describe("The policy's ID") },
    },
    async ({ policyId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/policy/${encodeURIComponent(policyId)}/toggle`, {
          method: "PATCH",
        }),
      ),
  );

  server.registerTool(
    "delete_access_policy",
    {
      title: "Delete access control policy",
      description: `Delete an access control policy. ${PERMISSION_NOTE}`,
      inputSchema: { policyId: z.string().describe("The policy's ID") },
    },
    async ({ policyId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/policy/${encodeURIComponent(policyId)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "invalidate_access_control_cache",
    {
      title: "Invalidate access control cache",
      description: `Force-reload all access control policies from the database into cache. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/access-control/cache/invalidate", { method: "POST" }),
      ),
  );

  // ==================== Domain groups ====================

  server.registerTool(
    "create_domain_group",
    {
      title: "Create domain group",
      description: `Create a reusable named group of domains for use in access control policies. ${PERMISSION_NOTE}`,
      inputSchema: {
        name: z.string().describe("Group name"),
        description: z.string().optional().describe("Group description"),
        domains: z.array(domainEntry).describe("Domains in the group, string or {domain, isWildcard}"),
      },
    },
    async ({ name, description, domains }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/access-control/domain-group", {
          method: "POST",
          body: { name, description, domains },
        }),
      ),
  );

  server.registerTool(
    "list_domain_groups",
    {
      title: "List domain groups",
      description: `List all domain groups. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/access-control/domain-groups")),
  );

  server.registerTool(
    "get_domain_group",
    {
      title: "Get domain group",
      description: `Get a domain group by ID. ${PERMISSION_NOTE}`,
      inputSchema: { groupId: z.string().describe("The group's ID") },
    },
    async ({ groupId }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/access-control/domain-group/${encodeURIComponent(groupId)}`)),
  );

  server.registerTool(
    "update_domain_group",
    {
      title: "Update domain group",
      description: `Update a domain group's name, description, or domains. Only the provided fields are changed. ${PERMISSION_NOTE}`,
      inputSchema: {
        groupId: z.string().describe("The group's ID"),
        name: z.string().optional().describe("Group name"),
        description: z.string().optional().describe("Group description"),
        domains: z.array(domainEntry).optional().describe("Domains in the group, string or {domain, isWildcard}"),
      },
    },
    async ({ groupId, ...body }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/domain-group/${encodeURIComponent(groupId)}`, {
          method: "PUT",
          body,
        }),
      ),
  );

  server.registerTool(
    "delete_domain_group",
    {
      title: "Delete domain group",
      description: `Delete a domain group. ${PERMISSION_NOTE}`,
      inputSchema: { groupId: z.string().describe("The group's ID") },
    },
    async ({ groupId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/domain-group/${encodeURIComponent(groupId)}`, {
          method: "DELETE",
        }),
      ),
  );

  // ==================== IP groups ====================

  server.registerTool(
    "create_ip_group",
    {
      title: "Create IP group",
      description: `Create a reusable named group of IP addresses for use in access control policies. ${PERMISSION_NOTE}`,
      inputSchema: {
        name: z.string().describe("Group name"),
        description: z.string().optional().describe("Group description"),
        ipAddresses: z.array(z.string()).describe("IP addresses in the group"),
      },
    },
    async ({ name, description, ipAddresses }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/access-control/ip-group", {
          method: "POST",
          body: { name, description, ipAddresses },
        }),
      ),
  );

  server.registerTool(
    "list_ip_groups",
    {
      title: "List IP groups",
      description: `List all IP groups. ${PERMISSION_NOTE}`,
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/access-control/ip-groups")),
  );

  server.registerTool(
    "get_ip_group",
    {
      title: "Get IP group",
      description: `Get an IP group by ID. ${PERMISSION_NOTE}`,
      inputSchema: { groupId: z.string().describe("The group's ID") },
    },
    async ({ groupId }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/access-control/ip-group/${encodeURIComponent(groupId)}`)),
  );

  server.registerTool(
    "update_ip_group",
    {
      title: "Update IP group",
      description: `Update an IP group's name, description, or IP addresses. Only the provided fields are changed. ${PERMISSION_NOTE}`,
      inputSchema: {
        groupId: z.string().describe("The group's ID"),
        name: z.string().optional().describe("Group name"),
        description: z.string().optional().describe("Group description"),
        ipAddresses: z.array(z.string()).optional().describe("IP addresses in the group"),
      },
    },
    async ({ groupId, ...body }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/ip-group/${encodeURIComponent(groupId)}`, {
          method: "PUT",
          body,
        }),
      ),
  );

  server.registerTool(
    "delete_ip_group",
    {
      title: "Delete IP group",
      description: `Delete an IP group. ${PERMISSION_NOTE}`,
      inputSchema: { groupId: z.string().describe("The group's ID") },
    },
    async ({ groupId }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/access-control/ip-group/${encodeURIComponent(groupId)}`, {
          method: "DELETE",
        }),
      ),
  );
}
