/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Controllers
import DnsController from "../../Controller/DNS/DNS.controller";

// middleware
import authGuard from "../../Middlewares/authGuard.middleware";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

export interface DnsOptions extends FastifyPluginOptions { }

export default async function dnsRouter(fastify: FastifyInstance, _options: DnsOptions): Promise<void> {

  // add preHandler middleware if needed
  fastify.addHook("preHandler", authGuard.isAuthenticated);

  // DNS Routes
  // Create a new DNS record
  fastify.post("/create-dns", {
    schema: {
      description: 'Create a new DNS record',
      tags: ['DNS'],
      body: {
        type: 'object',
        required: ['DomainName', 'name', 'type', 'value'],
        properties: {
          DomainName: { type: 'string', description: 'The name of the domain' },
          name: { type: 'string', description: 'The name of the DNS record' },
          type: { type: 'string', enum: ['A', 'CNAME', "AAAA"], description: 'The type of DNS record' },
          value: { type: 'string', description: 'The value of the DNS record' },
          ttl: { type: 'number', description: 'Time to live for the DNS record in seconds', default: 100 },
        }
      },
      headers: {
        type: 'object',
        properties: {
          Authorization: { type: 'string', description: 'token for authentication' },
        },
        required: ['Authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(19)],
    handler: DnsController.create
  });

  // Get all DNS records for a domain
  fastify.get("/list/:domain", {
    schema: {
      description: 'Get all DNS records for a specific domain',
      tags: ['DNS'],
      params: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'The name of the domain' },
        },
        required: ['domain'],
      },
      headers: {
        type: 'object',
        properties: {
          Authorization: { type: 'string', description: 'token for authentication' },
        },
        required: ['Authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(20)],
    handler: DnsController.list
  });
}