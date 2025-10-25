import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// middlewares
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// services
import ServiceToggleService from "../../Services/settings/serviceToggle.service";

/**
 * SettingsController handles settings-related requests.
 * It provides methods for toggling services and other settings functionalities.
 * @class
 * @method fetchRouteConnectedIP - Handles fetching route-connected IPs.
 * @param {authGuardFastifyRequest} request - The Fastify request object.
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @returns {Promise<void>} - A promise that resolves when the login process is complete.
 */
export default class SettingsController {
  constructor() { }

  // Toggle service
  static toggleService(request: authGuardFastifyRequest, reply: FastifyReply) {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Service update failed");
    const serviceToggler = new ServiceToggleService(reply)
    try {
      return serviceToggler.toggleService()
    } catch (error) {
      return Responser.send(error);
    }
  }
}