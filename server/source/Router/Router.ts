/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import buildResponse from "../helper/responseBuilder.helper";
import { StatusCodes } from "outers";

// All Sub Routers
import authRouter from "./Auth/Auth.route";

// Controllers
import PublicInfoController from "../Controller/Public/public.controller";
import authGuard from "../Middlewares/authGuard.middleware";
import domainRouter from "./Domains/Domains.route";
import DHCPRouter from "./DHCP/DHCP.route";


// Extended options interface to include NexoralDNS instance
interface RouterOptions extends FastifyPluginOptions { }

/**
 * Main router plugin for the NexoralDNS server
 * @param fastify - Fastify instance
 * @param _options - Plugin options
 * @param done - Callback to signal completion
 */
export default async function mainRouter(
  fastify: FastifyInstance,
  _options: RouterOptions,
  done: () => void,
): Promise<void> {

  // General Specific Middleware (e.g, health check, info, etc.)
  fastify.get("/info", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return PublicInfoController.getInfo(reply);
  });


  // Health check route
  fastify.get("/health", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return PublicInfoController.getHealth(reply);
  });

  // Register Sub-Routers
  fastify.register(authRouter, { prefix: "/auth" });
  fastify.register(domainRouter, { prefix: "/domains" });
  fastify.register(DHCPRouter, { prefix: "/dhcp" });


  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    const FastifyResponse = new buildResponse(reply, StatusCodes.NOT_FOUND);
    return FastifyResponse.send(
      {
        message: `Route ${request.method}:${request.url} not found`,
      },
    );
  });

// Finalize the router setup
  done();
}