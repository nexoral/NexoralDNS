/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FastifyInstance, FastifyPluginOptions } from "fastify";
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
  options: RouterOptions,
  done: () => void,
): Promise<void> {
  // Now you can access the NexoralDNS instance
  const { NexoralDNSInstance } = options;

  fastify.get("/info", async () => {
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
    return Reply;
  });

  // Health check route
  fastify.get("/health", async () => {
    const Reply: ResponseBuilder = buildResponse(
      StatusCodes.OK,
      "Server is healthy",
      {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    );
    return Reply;
  });


  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    return reply
      .status(404)
      .send(
        buildResponse(
          StatusCodes.NOT_FOUND,
          `Route ${request.method}:${request.url} not found`,
        ),
      );
  });

  done();
}