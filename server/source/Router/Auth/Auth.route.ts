/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import AuthController from "../../Controller/Auth/auth.controller";
import { authGuard } from "../../Middlewares/authGuard.middleware";

export interface AuthOptions extends FastifyPluginOptions {}

export default async function authRouter(fastify: FastifyInstance, _options: AuthOptions): Promise<void> {

  // Login — strict rate limit: 10 requests per 15 minutes per IP
  fastify.post("/login", {
    schema: {
      description: 'Authenticate user and issue httpOnly cookie tokens',
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
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } as any,
    handler: AuthController.login,
  });

  // Logout — requires valid session cookie
  fastify.post("/logout", {
    schema: {
      description: 'Invalidate session and clear auth cookies',
      tags: ['Auth'],
    },
    preHandler: [authGuard.isAuthenticated],
    handler: AuthController.logout,
  });

  // Refresh access token using refresh cookie
  fastify.post("/refresh-token", {
    schema: {
      description: 'Issue a new 30-minute access token using the refresh token cookie',
      tags: ['Auth'],
    },
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } as any,
    handler: AuthController.refreshToken,
  });

  // Verify session — returns user data from the active session
  fastify.get("/verify", {
    schema: {
      description: 'Verify session validity and return user details',
      tags: ['Auth'],
    },
    preHandler: [authGuard.isAuthenticated],
    handler: AuthController.verifySession,
  });

  // Change password — requires valid session
  fastify.post("/change-password", {
    schema: {
      description: 'Change user password',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', description: 'The current password of the user' },
          newPassword: { type: 'string', description: 'The new password for the user (minimum 6 characters)' },
        }
      },
    },
    preHandler: [authGuard.isAuthenticated],
    handler: AuthController.changePassword,
  });
}
