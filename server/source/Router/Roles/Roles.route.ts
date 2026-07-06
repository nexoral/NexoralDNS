import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

// Controller
import RolesController from "../../Controller/Roles/Roles.controller";

export interface RolesOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function RolesRouter(fastify: FastifyInstance, _options: RolesOptions): Promise<void> {

  // Get the fixed permission catalog (used to render the permission checkbox list)
  fastify.get("/permissions", {
    schema: {
      description: 'Get all available permissions',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.getPermissions
  });

  // Create a new role
  fastify.post("/", {
    schema: {
      description: 'Create a new role with a chosen set of permissions',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      body: {
        type: 'object',
        required: ['name', 'permissionCodes'],
        properties: {
          name: { type: 'string', description: 'Role name' },
          permissionCodes: {
            type: 'array',
            items: { type: 'number' },
            description: 'List of permission codes to grant this role'
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.createRole
  });

  // Get all roles
  fastify.get("/", {
    schema: {
      description: 'Get all roles with their permissions populated',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          skip: { type: 'string', description: 'Number of documents to skip', default: '0' },
          limit: { type: 'string', description: 'Maximum number of documents to return', default: '50' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.getRoles
  });

  // Get a single role by ID
  fastify.get("/:roleId", {
    schema: {
      description: 'Get a single role by ID',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', description: 'The role ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.getRoleById
  });

  // Update a role
  fastify.put("/:roleId", {
    schema: {
      description: 'Update a role\'s name and/or permissions',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', description: 'The role ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Role name' },
          permissionCodes: {
            type: 'array',
            items: { type: 'number' },
            description: 'List of permission codes to grant this role'
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.updateRole
  });

  // Delete a role
  fastify.delete("/:roleId", {
    schema: {
      description: 'Delete a role (rejected if any user is still assigned to it)',
      tags: ['Roles'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string', description: 'The role ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 6)],
    handler: RolesController.deleteRole
  });
}
