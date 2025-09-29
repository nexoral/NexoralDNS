/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import buildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";

export interface AuthOptions extends FastifyPluginOptions { }

export default async function authRouter(fastify: FastifyInstance, _options: AuthOptions): Promise<void> {

  // Login Route
  fastify.post("/login", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const FastifyResponse = new buildResponse(reply, StatusCodes.OK, "Login route - to be implemented");
    return FastifyResponse.send(
      {
        message: "Login functionality is not yet implemented.",
      },
    );
  });

}