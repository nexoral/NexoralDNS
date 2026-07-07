import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import apiClient from "../client/ApiClient";
import { fromApiResult, requireSessionId } from "./toolResult";

const dnsRecordType = z.enum(["A", "CNAME", "AAAA"]);

export default function registerDnsTools(server: McpServer): void {
  server.registerTool(
    "list_dns_records",
    {
      title: "List DNS records",
      description: "List every DNS record configured under a domain.",
      inputSchema: {
        domain: z.string().describe("The domain name to list records for"),
      },
    },
    async ({ domain }, extra) =>
      fromApiResult(await apiClient.request(requireSessionId(extra), `/dns/list/${encodeURIComponent(domain)}`)),
  );

  server.registerTool(
    "create_dns_record",
    {
      title: "Create DNS record",
      description: "Create a new DNS record (A, CNAME, or AAAA) under a domain.",
      inputSchema: {
        domainName: z.string().describe("The domain the record belongs to"),
        name: z.string().describe("The record name (e.g. subdomain label)"),
        type: dnsRecordType.describe("The DNS record type"),
        value: z.string().describe("The record value (e.g. an IP address or target hostname)"),
        ttl: z.number().int().positive().optional().describe("Time to live in seconds (defaults to the account's default TTL)"),
      },
    },
    async ({ domainName, name, type, value, ttl }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/dns/create-dns", {
          method: "POST",
          body: { DomainName: domainName, name, type, value, ttl },
        }),
      ),
  );

  server.registerTool(
    "update_dns_record",
    {
      title: "Update DNS record",
      description: "Update an existing DNS record by its ID. Only the provided fields are changed.",
      inputSchema: {
        id: z.string().describe("The ID of the DNS record to update"),
        name: z.string().optional().describe("New record name"),
        type: dnsRecordType.optional().describe("New DNS record type"),
        value: z.string().optional().describe("New record value"),
        ttl: z.number().int().positive().optional().describe("New time to live in seconds"),
      },
    },
    async ({ id, name, type, value, ttl }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), `/dns/update/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: { name, type, value, ttl },
        }),
      ),
  );

  server.registerTool(
    "delete_dns_record",
    {
      title: "Delete DNS record",
      description: "Delete a DNS record by ID from a domain.",
      inputSchema: {
        id: z.string().describe("The ID of the DNS record to delete"),
        domainName: z.string().describe("The domain the record belongs to"),
      },
    },
    async ({ id, domainName }, extra) =>
      fromApiResult(
        await apiClient.request(requireSessionId(extra), "/dns/delete", {
          method: "PUT",
          body: { id, domainName },
        }),
      ),
  );
}
