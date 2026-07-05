import { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// middlewares
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// services
import RouterService from "../../Services/DHCP/Router_connection.service";
import container from '../../container/appContainer';

/**
 * DhcpController handles DHCP-related requests.
 * It provides methods for fetching route-connected IPs and other DHCP functionalities.
 * @class
 * @method fetchRouteConnectedIP - Handles fetching route-connected IPs.
 * @param {FastifyRequest} request - The Fastify request object.
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @returns {Promise<void>} - A promise that resolves when the login process is complete.
 */
export default class DhcpController {
  constructor() { }

  // Fetch all connected IPs from the router
  public static async fetchRouteConnectedIP(
    request: authGuardFastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Record fetch failed");

    // Initialize LoginService
    const loginService = container.get<RouterService>('RouterConnectionService');

    try {
      return loginService.fetchConnectedIPs(reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  // refresh the connected IPs by calling the cron job function
  public static async refreshConnectedIP(
    request: authGuardFastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Record update failed");

    // Initialize LoginService
    const loginService = container.get<RouterService>('RouterConnectionService');

    try {
      return loginService.refreshConnectedIPs(reply);
    } catch (error) {
      return Responser.send(error);
    }
  }
}