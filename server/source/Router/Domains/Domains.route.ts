/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Controllers
import DomainController from "../../Controller/Domain/Domain.controller";

// middleware
import authGuard from "../../Middlewares/authGuard.middleware";

export interface DomainOptions extends FastifyPluginOptions { }

export default async function domainRouter(fastify: FastifyInstance, _options: DomainOptions): Promise<void> {

  // add preHandler middleware if needed
  fastify.addHook("preHandler", authGuard.isAuthenticated);

  // Domain Routes
  fastify.post("/create-domain", {
    schema: {
      description: 'Create a new domain',
      tags: ['Domain'],
      body: {
        type: 'object',
        required: ['DomainName', 'type', 'IpAddress'],
        properties: {
          DomainName: { type: 'string', description: 'The name of the domain' },
          type: { type: 'string', enum: ['A', 'CNAME', "AAAA"], description: 'The type of DNS record' },
          IpAddress: { type: 'string', description: 'The IP address of the domain' },
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
    handler: DomainController.create
  });
  fastify.get("/all-domains", {
    schema: {
      description: 'Get a list of all domains',
      tags: ['Domain'],
      headers: {
        type: 'object',
        properties: {
          Authorization: { type: 'string', description: 'token for authentication' },
        },
        required: ['Authorization'],
      },
    },
    preHandler: [],
    handler: DomainController.list
  });
  // fastify.get("/domains/:id", { preHandler: [] }, DomainController.get);
  // fastify.put("/domains/:id", { preHandler: [] }, DomainController.update);
  // fastify.delete("/domains/:id", { preHandler: [] }, DomainController.delete);

}