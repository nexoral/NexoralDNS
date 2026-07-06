import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import RequestControllerHelper from "../../helper/Request_Controller.helper";
import DashboardService from "../../Services/Dashboard/Dashboard.service";

// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();


export default class AnalyticsController {
  constructor () {}

  // Responsible for Get Dashboard Data
  public static async getDashboardAnalytics(request: authGuardFastifyRequest, response: FastifyReply): Promise<void> {
    const DashboardDataService = new DashboardService(response);
   const Responser = new BuildResponse(response, StatusCodes.OK, "Dashboard Analytics retrieved successfully");
    try {
      await DashboardDataService.getDashboardData();
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error retrieving Dashboard Analytics");
      return Responser.send("An error occurred while retrieving Dashboard Analytics");
    }
  }
}