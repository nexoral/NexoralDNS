/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Controllers
import AuthController from "../../Controller/Auth/auth.controller";

export interface AuthOptions extends FastifyPluginOptions { }

export default async function authRouter(fastify: FastifyInstance, _options: AuthOptions): Promise<void> {

  // Login Route
  fastify.post("/login", {
    schema: {
      description: 'Authenticate a user and return a JWT token',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', description: 'The username of the user' },
          password: { type: 'string', description: 'The password of the user' },
        }
      },
    },
    preHandler: [],
    handler: AuthController.login
  });

}