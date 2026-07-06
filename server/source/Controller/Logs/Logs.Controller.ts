import logger from '../../utilities/logger';
import { FastifyReply, FastifyRequest } from "fastify";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";

// service import
import LogsService from "../../Services/Logs/Logs.service";

import BuildResponse from "../../helper/responseBuilder.helper";
import { StatusCodes } from "outers";
import RequestControllerHelper from "../../helper/Request_Controller.helper";
import { buildLogsQuery, LogsQueryFilters } from "../../helper/buildLogsQuery.helper";
import container from '../../container/appContainer';


export default class LogsController {
  constructor() { }

  // List all domains for the authenticated user
  public static async getLogs(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    // Data types of Request query
    interface requestQueryParams extends LogsQueryFilters {
      limit: string,
      cursor: string,
    }

    const Responser = new BuildResponse(reply, StatusCodes.OK, "Logs fetched successfully");
    const LogsServices = container.get<LogsService>('LogsService');

    // Parse Query params
    const requestQuery = request.query as requestQueryParams;

    // Remove empty values from filters
    const filters: requestQueryParams = {} as requestQueryParams;

    for (const key in requestQuery) {
      if (requestQuery[key] !== "" && requestQuery[key] !== undefined) {
        filters[key] = requestQuery[key];
      }
    }

    const query = buildLogsQuery(filters);

    try {
      await LogsServices.getAnalyticalLogs(parseInt(filters.limit), filters.cursor, query, reply);
    } catch (error) {
      logger.info(error)
      Responser.setStatusCode(StatusCodes.INTERNAL_SERVER_ERROR);
      Responser.setMessage("Error fetching logs list");
      return Responser.send("An error occurred while fetching the logs list");
    }
  }
}