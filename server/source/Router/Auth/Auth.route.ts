/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Controllers
import AuthController from "../../Controller/Auth/auth.controller";

export interface AuthOptions extends FastifyPluginOptions { }

export default async function authRouter(fastify: FastifyInstance, _options: AuthOptions): Promise<void> {

  // Login Route
  fastify.post("/login", { preHandler: [] }, AuthController.login);

}