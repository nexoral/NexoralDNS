import { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// middlewares
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// services
import RouterService from "../../Services/DHCP/Router_connection.service";

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

  public static async fetchRouteConnectedIP(
    request: authGuardFastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Record fetch failed");

    // Initialize LoginService
    const loginService = new RouterService(reply);

    try {
      return loginService.fetchConnectedIPs();
    } catch (error) {
      return Responser.send(error);
    }
  }
}