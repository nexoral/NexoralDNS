import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import LogsExportService, { LogExportFormat } from "../../Services/Logs/LogsExport.service";
import { LogsQueryFilters } from "../../helper/buildLogsQuery.helper";
import container from '../../container/appContainer';

interface ExportRequestBody extends LogsQueryFilters {
  format: LogExportFormat;
}

export default class LogsExportController {
  constructor() { }

  public static async requestExport(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.BAD_REQUEST, "Failed to request export");
    const { format, ...filters } = request.body as ExportRequestBody;

    if (format !== "txt") {
      return Responser.send({ error: "format must be 'txt'" });
    }

    try {
      await container.get<LogsExportService>('LogsExportService').requestExport(request.user._id, format, filters, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async getExportStatus(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch export status");
    try {
      await container.get<LogsExportService>('LogsExportService').getExportStatus(request.user._id, reply);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async downloadExport(request: authGuardFastifyRequest, reply: FastifyReply): Promise<unknown> {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to download export");
    try {
      return await container.get<LogsExportService>('LogsExportService').downloadExport(request.user._id, reply);
    } catch (error) {
      Responser.send(error);
      return reply;
    }
  }
}
