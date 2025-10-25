/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";

// Controllers
import SettingsController from "../../Controller/settings/settings.controller";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

export interface SettingsOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function SettingsRouter(fastify: FastifyInstance, _options: SettingsOptions): Promise<void> {

  // Fetch all connected IPs from the router
  fastify.get("/toggle-service", {
    schema: {
      description: 'Toggle a service on the router',
      tags: ['Settings'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: SettingsController.toggleService
  });

}