/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";

// Controllers
import AnalyticsController from "../../Controller/Analytics/Analytics.controller";
import LogsController from "../../Controller/Logs/Logs.Controller";
import PermissionGuard from "../../Middlewares/permissionGuard.middleware";

export interface AnalyticsOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function AnalyticsRouter(fastify: FastifyInstance, _options: AnalyticsOptions): Promise<void> {

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

  // get Logs for Logs Page
  fastify.get("/get-logs", {
    schema: {
      description: 'Fetch All Analytics Data for Logs Page',
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
    handler: LogsController.getLogs
  })

}