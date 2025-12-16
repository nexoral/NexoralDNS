import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import AccessControlAnalyticsService from "../../Services/AccessControl/AccessControlAnalytics.service";

export default class AccessControlAnalyticsController {
  constructor() { }

  /**
   * Get access control analytics
   */
  public static getAnalytics(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch analytics");
    const analyticsService = new AccessControlAnalyticsService(reply);

    try {
      return analyticsService.getAnalytics();
    } catch (error) {
      return Responser.send(error);
    }
  }

  /**
   * Get detailed policy statistics
   */
  public static getPolicyStatistics(request: authGuardFastifyRequest, reply: FastifyReply) {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch policy statistics");
    const analyticsService = new AccessControlAnalyticsService(reply);

    try {
      return analyticsService.getPolicyStatistics();
    } catch (error) {
      return Responser.send(error);
    }
  }
}
