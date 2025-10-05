/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Controllers
import DnsController from "../../Controller/DNS/DNS.controller";

// middleware
import authGuard from "../../Middlewares/authGuard.middleware";

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
        required: ['DomainName', 'type', 'value'],
        properties: {
          DomainName: { type: 'string', description: 'The name of the domain' },
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
    preHandler: [],
    handler: DnsController.create
  });
}