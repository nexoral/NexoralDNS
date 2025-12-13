import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import { LogsService } from "../../Services/Logs/Logs.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import RequestControllerHelper from "../../helper/Request_Controller.helper";
import { parse } from "path";


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
      from: string,
      to: string,
      Status: string,
      durationFrom: string,
      durationTo: string,
      limit: string,
      cursor: string,
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

    // Helper function to escape regex special characters
    const escapeRegex = (str: string): string => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // query constructor
    const query: any = {}

    // Use regex for partial matching on SourceIP and queryName
    if (filters.SourceIP) {
      query.SourceIP = {
        $regex: escapeRegex(filters.SourceIP),
        $options: 'i' // case-insensitive
      };
    }

    if (filters.queryName) {
      query.queryName = {
        $regex: escapeRegex(filters.queryName),
        $options: 'i' // case-insensitive
      };
    }

    // Exact match for Status
    if (filters.Status) query.Status = filters.Status

    // Handle timestamp range filters
    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = parseFloat(filters.from);
      if (filters.to) query.timestamp.$lte = parseFloat(filters.to);
    }

    // Handle duration range filters
    if (filters.durationFrom || filters.durationTo) {
      query.duration = {};
      if (filters.durationFrom) query.duration.$gte = parseFloat(filters.durationFrom);
      if (filters.durationTo) query.duration.$lte = parseFloat(filters.durationTo);
    }    
    
    try {
      await LogsServices.getAnalyticalLogs(parseInt(filters.limit), filters.cursor, query);
    } catch (error) {
      console.log(error)
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error fetching logs list");
      return Responser.send("An error occurred while fetching the logs list");
    }
  }
}