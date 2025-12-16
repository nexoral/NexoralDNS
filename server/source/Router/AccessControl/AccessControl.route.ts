/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

// Controllers
import AccessControlController from "../../Controller/AccessControl/AccessControl.controller";
import DomainGroupController from "../../Controller/AccessControl/DomainGroup.controller";
import IPGroupController from "../../Controller/AccessControl/IPGroup.controller";
import AccessControlAnalyticsController from "../../Controller/AccessControl/AccessControlAnalytics.controller";

export interface AccessControlOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function AccessControlRouter(fastify: FastifyInstance, _options: AccessControlOptions): Promise<void> {

  // ==================== ACCESS CONTROL POLICIES ====================

  // Create a new access control policy
  fastify.post("/policy", {
    schema: {
      description: 'Create a new access control policy',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      body: {
        type: 'object',
        required: ['policyType', 'targetType', 'blockType', 'policyName', 'isActive'],
        properties: {
          policyType: {
            type: 'string',
            enum: ['user_domain', 'user_internet', 'domain_all', 'domain_user', 'group_based'],
            description: 'Type of policy'
          },
          targetType: {
            type: 'string',
            enum: ['single_ip', 'ip_group', 'all'],
            description: 'Target type for the policy'
          },
          targetIP: {
            type: 'string',
            description: 'Target IP address (required when targetType is single_ip)'
          },
          targetIPGroup: {
            type: 'string',
            description: 'Target IP group (required when targetType is ip_group)'
          },
          blockType: {
            type: 'string',
            enum: ['specific_domains', 'domain_group', 'full_internet'],
            description: 'Type of blocking to apply'
          },
          domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of domains to block (required when blockType is specific_domains)'
          },
          domainGroup: {
            type: 'string',
            description: 'Domain group to block (required when blockType is domain_group)'
          },
          policyName: {
            type: 'string',
            description: 'Name of the policy'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the policy is active'
          }
        }
      },
      response: {
        201: {
          description: 'Successful response',
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                policyId: { type: 'string' },
                policy: { type: 'object' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid data',
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
        },
        409: {
          description: 'Conflict - Policy already exists',
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
    handler: AccessControlController.createPolicy
  });

  // Get all access control policies with optional filtering
  fastify.get("/policies", {
    schema: {
      description: 'Get all access control policies with optional filtering',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      querystring: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter type (all, active, inactive, user_domain, user_internet, domain_all, domain_user, group_based)',
            default: 'all'
          },
          skip: {
            type: 'string',
            description: 'Number of documents to skip',
            default: '0'
          },
          limit: {
            type: 'string',
            description: 'Maximum number of documents to return',
            default: '50'
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
                policies: { type: 'array' },
                total: { type: 'number' },
                skip: { type: 'number' },
                limit: { type: 'number' },
                filter: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: AccessControlController.getPolicies
  });

  // Get a single access control policy by ID
  fastify.get("/policy/:policyId", {
    schema: {
      description: 'Get a single access control policy by ID',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: {
            type: 'string',
            description: 'The policy ID'
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
                policy: { type: 'object' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid policy ID',
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
        },
        404: {
          description: 'Not found - Policy not found',
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
    handler: AccessControlController.getPolicyById
  });

  // Update an access control policy
  fastify.put("/policy/:policyId", {
    schema: {
      description: 'Update an access control policy',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: {
            type: 'string',
            description: 'The policy ID'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          policyType: {
            type: 'string',
            enum: ['user_domain', 'user_internet', 'domain_all', 'domain_user', 'group_based'],
            description: 'Type of policy'
          },
          targetType: {
            type: 'string',
            enum: ['single_ip', 'ip_group', 'all'],
            description: 'Target type for the policy'
          },
          targetIP: {
            type: 'string',
            description: 'Target IP address'
          },
          targetIPGroup: {
            type: 'string',
            description: 'Target IP group'
          },
          blockType: {
            type: 'string',
            enum: ['specific_domains', 'domain_group', 'full_internet'],
            description: 'Type of blocking to apply'
          },
          domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of domains to block'
          },
          domainGroup: {
            type: 'string',
            description: 'Domain group to block'
          },
          policyName: {
            type: 'string',
            description: 'Name of the policy'
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the policy is active'
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
                policy: { type: 'object' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid data',
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
        },
        404: {
          description: 'Not found - Policy not found',
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
        },
        409: {
          description: 'Conflict - Policy name already exists',
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
    handler: AccessControlController.updatePolicy
  });

  // Toggle policy active status
  fastify.patch("/policy/:policyId/toggle", {
    schema: {
      description: 'Toggle policy active status',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: {
            type: 'string',
            description: 'The policy ID'
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
                policyId: { type: 'string' },
                isActive: { type: 'boolean' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid policy ID',
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
        },
        404: {
          description: 'Not found - Policy not found',
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
    handler: AccessControlController.togglePolicyStatus
  });

  // Delete an access control policy
  fastify.delete("/policy/:policyId", {
    schema: {
      description: 'Delete an access control policy',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['policyId'],
        properties: {
          policyId: {
            type: 'string',
            description: 'The policy ID'
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
                policyId: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        400: {
          description: 'Bad request - Invalid policy ID',
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
        },
        404: {
          description: 'Not found - Policy not found',
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
    handler: AccessControlController.deletePolicy
  });

  // ==================== DOMAIN GROUPS ====================

  // Create domain group
  fastify.post("/domain-group", {
    schema: {
      description: 'Create a new domain group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      body: {
        type: 'object',
        required: ['name', 'domains'],
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Group description' },
          domains: { type: 'array', items: { type: 'string' }, description: 'List of domains' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: DomainGroupController.createDomainGroup
  });

  // Get all domain groups
  fastify.get("/domain-groups", {
    schema: {
      description: 'Get all domain groups',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: DomainGroupController.getDomainGroups
  });

  // Get single domain group
  fastify.get("/domain-group/:groupId", {
    schema: {
      description: 'Get a domain group by ID',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: DomainGroupController.getDomainGroupById
  });

  // Update domain group
  fastify.put("/domain-group/:groupId", {
    schema: {
      description: 'Update a domain group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Group description' },
          domains: { type: 'array', items: { type: 'string' }, description: 'List of domains' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: DomainGroupController.updateDomainGroup
  });

  // Delete domain group
  fastify.delete("/domain-group/:groupId", {
    schema: {
      description: 'Delete a domain group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: DomainGroupController.deleteDomainGroup
  });

  // ==================== IP GROUPS ====================

  // Create IP group
  fastify.post("/ip-group", {
    schema: {
      description: 'Create a new IP group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      body: {
        type: 'object',
        required: ['name', 'ipAddresses'],
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Group description' },
          ipAddresses: { type: 'array', items: { type: 'string' }, description: 'List of IP addresses' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: IPGroupController.createIPGroup
  });

  // Get all IP groups
  fastify.get("/ip-groups", {
    schema: {
      description: 'Get all IP groups',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: IPGroupController.getIPGroups
  });

  // Get single IP group
  fastify.get("/ip-group/:groupId", {
    schema: {
      description: 'Get an IP group by ID',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: IPGroupController.getIPGroupById
  });

  // Update IP group
  fastify.put("/ip-group/:groupId", {
    schema: {
      description: 'Update an IP group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Group name' },
          description: { type: 'string', description: 'Group description' },
          ipAddresses: { type: 'array', items: { type: 'string' }, description: 'List of IP addresses' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: IPGroupController.updateIPGroup
  });

  // Delete IP group
  fastify.delete("/ip-group/:groupId", {
    schema: {
      description: 'Delete an IP group',
      tags: ['Access Control'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
      params: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', description: 'The group ID' }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: IPGroupController.deleteIPGroup
  });

  // ==================== ANALYTICS ====================

  // Get access control analytics
  fastify.get("/analytics", {
    schema: {
      description: 'Get access control analytics',
      tags: ['Access Control'],
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
                activePolicies: { type: 'number' },
                totalPolicies: { type: 'number' },
                blockedUsers: { type: 'number' },
                blockedDomains: { type: 'number' },
                blocksToday: { type: 'number' },
                domainGroups: { type: 'number' },
                ipGroups: { type: 'number' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: AccessControlAnalyticsController.getAnalytics
  });

  // Get detailed policy statistics
  fastify.get("/analytics/policies", {
    schema: {
      description: 'Get detailed policy statistics',
      tags: ['Access Control'],
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
                byType: { type: 'object' },
                byStatus: { type: 'object' },
                byTarget: { type: 'object' },
                byBlockType: { type: 'object' },
                total: { type: 'number' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [authGuard.isAuthenticated, PermissionGuard.canAccess(4, 8)],
    handler: AccessControlAnalyticsController.getPolicyStatistics
  });

}
