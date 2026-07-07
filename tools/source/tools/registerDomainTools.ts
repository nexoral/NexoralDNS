import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId } from "./toolResult";

export default function registerDomainTools(server: McpServer): void {
  server.registerTool(
    "list_domains",
    {
      title: "List domains",
      description: "List every domain registered in NexoralDNS.",
      inputSchema: {},
    },
    async (_args, extra) => fromApiResult(await apiClient.request(requireSessionId(extra), "/domains/all-domains")),
  );

  server.registerTool(
    "create_domain",
    {
      title: "Create domain",
      description: "Register a new domain in NexoralDNS.",
      inputSchema: {
        domainName: z.string().describe("The domain name to create"),
        type: z.enum(["A", "CNAME", "AAAA"]).describe("The DNS record type backing the domain"),
        ipAddress: z.string().describe("The IP address the domain points to"),
      },
    },
    async ({ domainName, type, ipAddress }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/domains/create-domain", {
          method: "POST",
          body: { DomainName: domainName, type, IpAddress: ipAddress },
        }),
      ),
  );

  server.registerTool(
    "delete_domain",
    {
      title: "Delete domain",
      description: "Delete a domain by name from NexoralDNS.",
      inputSchema: {
        domainName: z.string().describe("The name of the domain to delete"),
      },
    },
    async ({ domainName }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/domains/delete", {
          method: "DELETE",
          body: { domainName },
        }),
      ),
  );
}
