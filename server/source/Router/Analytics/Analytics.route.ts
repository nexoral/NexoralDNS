/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";

// Controllers
import AnalyticsController from "../../Controller/Analytics/Analytics.controller";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

export interface DhcpOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function AnalyticsRouter(fastify: FastifyInstance, _options: DhcpOptions): Promise<void> {

  // Fetch all Dashboard related data
  fastify.get("/get-dashboard-data", {
    schema: {
      description: 'Fetch All Analytics Data for Dashboard',
      tags: ['Analytics'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated],
    handler: AnalyticsController.getDashboardAnalytics
  });

}