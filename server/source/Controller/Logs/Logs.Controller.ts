import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import { LogsService } from "../../Services/Logs/Logs.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import RequestControllerHelper from "../../helper/Request_Controller.helper";


// Singleton instance for request deduplication
const requestHelper = new RequestControllerHelper();

export default class LogsController {
  constructor() { }
  
  // List all domains for the authenticated user
  public static async getLogs(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    // Data types of Request query
    interface requestQueryParams {
      SourceIP: string,
      queryName: string,
      from: number,
      to: number,
      Status: string,
      durationFrom: number,
      durationTo: number,
      limit: number,
      page: number,
      [key: string]: string | number; // Add index signature
    }

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Logs fetched successfully");
    const LogsServices = new LogsService(reply);

    // Parse Query params
    const requestQuery = request.query as requestQueryParams;
    
    // Remove empty values from filters
    const filters: requestQueryParams = {} as requestQueryParams;

    for (const key in requestQuery) {
      if (requestQuery[key] !== "" && requestQuery[key] !== undefined) {
        filters[key] = requestQuery[key];
      }
    }

    // query constructor
    const query: requestQueryParams = {} as requestQueryParams
    if (filters.SourceIP) query.SourceIP = filters.SourceIP
    if (filters.Status) query.Status = filters.Status
    if (filters.from && filters.to) query.ssfw = 

    try {
      await LogsServices.getAnalyticalLogs(filters.limit, filters.page);
    } catch (error) {
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error fetching domain list");
      return Responser.send("An error occurred while fetching the domain list");
    }
  }
}