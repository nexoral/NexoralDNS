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
  fastify.get("/list-of-available-ips", { preHandler: [authGuard.isAuthenticated] }, DhcpController.fetchRouteConnectedIP);

  // refresh the connected IPs by calling the cron job function
  fastify.get("/refresh-connected-ips", { preHandler: [authGuard.isAuthenticated] }, DhcpController.refreshConnectedIP);

}