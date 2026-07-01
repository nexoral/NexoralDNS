import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

// Controller
import UsersController from "../../Controller/Users/Users.controller";

export interface UsersOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function UsersRouter(fastify: FastifyInstance, _options: UsersOptions): Promise<void> {

  // Create a new user with an admin-set username + temporary password
  fastify.post("/", {
    schema: {
      description: 'Create a new user with a temporary password (forces a password change on first login)',
      tags: ['Users'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      body: {
        type: 'object',
        required: ['username', 'password', 'roleId'],
        properties: {
          username: { type: 'string', description: 'Username for the new user' },
          password: { type: 'string', description: 'Temporary password for the new user' },
          roleId: { type: 'string', description: 'The role to assign to the new user' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.createUser
  });

  // Get all users
  fastify.get("/", {
    schema: {
      description: 'Get all users with their role populated',
      tags: ['Users'],
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
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.getUsers
  });

  // Get a single user by ID
  fastify.get("/:userId", {
    schema: {
      description: 'Get a single user by ID',
      tags: ['Users'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'The user ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.getUserById
  });

  // Update a user's username, role, or active status
  fastify.put("/:userId", {
    schema: {
      description: 'Update a user\'s username, role, or active status',
      tags: ['Users'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'The user ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'New username' },
          roleId: { type: 'string', description: 'New role ID' },
          isActive: { type: 'boolean', description: 'Whether the user account is active' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.updateUser
  });

  // Admin resets a user's password to a new temporary one
  fastify.patch("/:userId/reset-password", {
    schema: {
      description: 'Reset a user\'s password to a new temporary password and force a change on next login',
      tags: ['Users'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'The user ID' }
        }
      },
      body: {
        type: 'object',
        required: ['newPassword'],
        properties: {
          newPassword: { type: 'string', description: 'New temporary password' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.resetPassword
  });

  // Delete a user
  fastify.delete("/:userId", {
    schema: {
      description: 'Delete a user',
      tags: ['Users'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
      },
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'The user ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 5)],
    handler: UsersController.deleteUser
  });
}
