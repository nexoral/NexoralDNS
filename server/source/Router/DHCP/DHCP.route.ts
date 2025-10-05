/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// middlewares
import authGuard from "../../Middlewares/authGuard.middleware";

// Controllers
import DhcpController from "../../Controller/DHCP/DHCP.controller";

export interface DhcpOptions extends FastifyPluginOptions { }

// Main Router Function
export default async function DHCPRouter(fastify: FastifyInstance, _options: DhcpOptions): Promise<void> {

  // Fetch all connected IPs from the router
  fastify.get("/list-of-available-ips", {
    schema: {
      description: 'Fetch the list of all connected IP addresses from the DHCP server',
      tags: ['DHCP'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated],
    handler: DhcpController.fetchRouteConnectedIP
  });

  // refresh the connected IPs by calling the cron job function
  fastify.get("/refresh-connected-ips", {
    schema: {
      description: 'Refresh the list of connected IP addresses by fetching the latest data from the DHCP server',
      tags: ['DHCP'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string', description: 'Bearer token for authentication' },
        },
        required: ['authorization'],
      },
    },
    preHandler: [authGuard.isAuthenticated],
    handler: DhcpController.refreshConnectedIP
  });

}