import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import { authGuardFastifyRequest } from "../../Middlewares/authGuard.middleware";
import LogsExportService, { LogExportFormat } from "../../Services/Logs/LogsExport.service";
import { LogsQueryFilters } from "../../helper/buildLogsQuery.helper";

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
      await new LogsExportService(reply).requestExport(request.user._id, format, filters);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async getExportStatus(request: authGuardFastifyRequest, reply: FastifyReply): Promise<void> {
    const Responser = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to fetch export status");
    try {
      await new LogsExportService(reply).getExportStatus(request.user._id);
    } catch (error) {
      return Responser.send(error);
    }
  }

  public static async downloadExport(request: authGuardFastifyRequest, reply: FastifyReply): Promise<unknown> {
    const Responser = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Failed to download export");
    try {
      return await new LogsExportService(reply).downloadExport(request.user._id);
    } catch (error) {
      Responser.send(error);
      return reply;
    }
  }
}
