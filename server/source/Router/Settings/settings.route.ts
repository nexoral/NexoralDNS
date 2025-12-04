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

  // Toggle DNS service (start/stop)
  fastify.get("/toggle-service", {
    schema: {
      description: 'Toggle DNS service on/off',
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

  // Get Default TTL value
  fastify.get("/default-ttl", {
    schema: {
      description: 'Get the current Default TTL (Time To Live) value for blocked domains and forwarder requests',
      tags: ['Settings'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                defaultTTL: { type: 'number', description: 'Current Default TTL in seconds' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: SettingsController.getDefaultTTL
  });

  // Update Default TTL value
  fastify.put("/default-ttl", {
    schema: {
      description: 'Update the Default TTL (Time To Live) value for blocked domains and forwarder requests',
      tags: ['Settings'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      body: {
        type: 'object',
        required: ['defaultTTL'],
        properties: {
          defaultTTL: {
            type: 'number',
            minimum: 10,
            maximum: 86400,
            description: 'New Default TTL value in seconds (min: 10, max: 86400)'
          }
        }
      },
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                defaultTTL: { type: 'number', description: 'Updated Default TTL in seconds' },
                message: { type: 'string' },
                appliesTo: {
                  type: 'array',
                  items: { type: 'string' }
                },
                note: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid TTL value',
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: SettingsController.updateDefaultTTL
  });

}