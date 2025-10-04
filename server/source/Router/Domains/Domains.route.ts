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
  fastify.post("/create-domain", { preHandler: [] }, DomainController.create);
  fastify.get("/all-domains", { preHandler: [] }, DomainController.list);
  // fastify.get("/domains/:id", { preHandler: [] }, DomainController.get);
  // fastify.put("/domains/:id", { preHandler: [] }, DomainController.update);
  // fastify.delete("/domains/:id", { preHandler: [] }, DomainController.delete);

}