/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { AuthorInfo } from "../core/key";
import buildResponse, {
  ResponseBuilder,
} from "../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import { readFile } from "node:fs/promises";

// All Sub Routers

// Interfaces
type PackageInterface = {
  name: string;
  version: number;
  author: string;
  license: string;
};

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
    const PackageFile: PackageInterface = JSON.parse(
      await readFile("./package.json", "utf-8"),
    );
    const Reply: ResponseBuilder = buildResponse(
      StatusCodes.OK,
      "NexoralDNS Information",
      {
        Package_Name: PackageFile.name,
        NexoralDNS_Version: PackageFile.version,
        Author_Name: PackageFile.author,
        License: PackageFile.license,
        AuthorDetails: AuthorInfo,
      },
    );
    return reply.code(StatusCodes.OK).send(Reply);
  });


  // Health check route
  fastify.get("/health", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const Reply: ResponseBuilder = buildResponse(
      StatusCodes.OK,
      "Server is healthy",
      {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    );
    return reply.code(StatusCodes.OK).send(Reply);
  });


  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    return reply
      .status(StatusCodes.NOT_FOUND)
      .send(
        buildResponse(
          StatusCodes.NOT_FOUND,
          `Route ${request.method}:${request.url} not found`,
        ),
      );
  });

  done();
}