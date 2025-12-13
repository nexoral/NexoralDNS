import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// middlewares
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// services
import ServiceToggleService from "../../Services/settings/serviceToggle.service";
import DefaultTTLService from "../../Services/settings/defaultTTL.service";
import CacheService from "../../Services/settings/Cache.service";

/**
 * SettingsController handles settings-related requests.
 * It provides methods for toggling services and other settings functionalities.
 * @class
 * @method toggleService - Handles service start/stop toggle.
 * @method getDefaultTTL - Handles fetching the current Default TTL value.
 * @method updateDefaultTTL - Handles updating the Default TTL value.
 * @param {authGuardFastifyRequest} request - The Fastify request object.
 * @param {FastifyReply} reply - The Fastify reply object for sending responses.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
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

  // Get Default TTL
  static getDefaultTTL(request: authGuardFastifyRequest, reply: FastifyReply) {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Failed to fetch Default TTL");
    const ttlService = new DefaultTTLService(reply);
    try {
      return ttlService.getDefaultTTL();
    } catch (error) {
      return Responser.send(error);
    }
  }

  // Update Default TTL
  static updateDefaultTTL(request: authGuardFastifyRequest, reply: FastifyReply) {
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Failed to update Default TTL");
    const ttlService = new DefaultTTLService(reply);
    try {
      const { defaultTTL } = request.body as { defaultTTL: number };
      return ttlService.updateDefaultTTL(defaultTTL);
    } catch (error) {
      return Responser.send(error);
    }
  }

  // Get Cache Stat
  static getCacheStat(request: authGuardFastifyRequest, reply: FastifyReply){
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.UNAUTHORIZED, "Failed to fetch Cache Data");
    const cacheService = new CacheService(reply);
    try {
      return cacheService.getStats();
    } catch (error) {
      return Responser.send(error);
    }
  }
}