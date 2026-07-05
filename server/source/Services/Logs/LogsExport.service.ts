import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import fs from "fs";
import crypto from "crypto";
import BuildResponse from "../../helper/responseBuilder.helper";
import { QueueKeys } from "../../Redis/CacheKeys.cache";
import { RedisCacheService } from "../../Redis/Redis.cache";
import container from "../../container/appContainer";
import { RabbitMQService } from "../../RabbitMQ/Rabbitmq.config";
import { LogsQueryFilters } from "../../helper/buildLogsQuery.helper";

export type LogExportFormat = "txt";
export type LogExportStatus = "queued" | "processing" | "ready" | "failed";

export interface LogExportMetadata {
  jobId: string;
  format: LogExportFormat;
  filters: LogsQueryFilters;
  status: LogExportStatus;
  requestedAt: number;
  readyAt?: number;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export interface LogExportJobMessage {
  userId: string;
  jobId: string;
  format: LogExportFormat;
  filters: LogsQueryFilters;
}

const CONTENT_TYPES: Record<LogExportFormat, string> = {
  txt: "text/plain",
};

export default class LogsExportService {

  constructor() { }

  public async requestExport(userId: string, format: LogExportFormat, filters: LogsQueryFilters, reply: FastifyReply): Promise<void> {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const redisKey = `log-export:${userId}`;
    const existingExport = await redisCacheService.get<LogExportMetadata>(redisKey);

    if (existingExport && existingExport.status !== "failed") {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.CONFLICT, "Export already in progress");
      return ErrorResponse.send({
        error: existingExport.status === "ready"
          ? "You have a ready export waiting — download or discard it before requesting a new one"
          : "An export is already being prepared — please wait for it to finish",
        status: existingExport.status,
      });
    }

    const jobId = crypto.randomUUID();
    const metadata: LogExportMetadata = {
      jobId,
      format,
      filters,
      status: "queued",
      requestedAt: Date.now(),
    };

    // Save metadata in Redis with a 24-hour expiration
    await redisCacheService.set(redisKey, metadata, 24 * 60 * 60);

    const published = await container.get<RabbitMQService>('RabbitMQService').publish(QueueKeys.LOGS_EXPORT, JSON.stringify({
      userId,
      jobId,
      format,
      filters,
    } as LogExportJobMessage));

    if (!published) {
      await redisCacheService.delete(redisKey);
      const ErrorResponse = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Failed to queue export");
      return ErrorResponse.send({ error: "Failed to queue the export job, please try again" });
    }

    const Responser = new BuildResponse(reply, StatusCodes.ACCEPTED, "Export queued");
    return Responser.send({ jobId, status: "queued" });
  }

  public async getExportStatus(userId: string, reply: FastifyReply): Promise<void> {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const redisKey = `log-export:${userId}`;
    const exportMeta = await redisCacheService.get<LogExportMetadata>(redisKey);
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Export status fetched");
    return Responser.send({ export: exportMeta });
  }

  public async downloadExport(userId: string, reply: FastifyReply): Promise<unknown> {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const redisKey = `log-export:${userId}`;
    const exportMeta = await redisCacheService.get<LogExportMetadata>(redisKey);

    if (!exportMeta || exportMeta.status !== "ready" || !exportMeta.filePath) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "No export ready");
      return ErrorResponse.send({ error: "No export is ready to download" });
    }

    if (!fs.existsSync(exportMeta.filePath)) {
      // File vanished (e.g. cleaned up by the sweep) — clear the stale reference
      await redisCacheService.delete(redisKey);
      const ErrorResponse = new BuildResponse(reply, StatusCodes.NOT_FOUND, "Export file missing");
      return ErrorResponse.send({ error: "The export file is no longer available, please request a new export" });
    }

    const filePath = exportMeta.filePath;
    const fileName = exportMeta.fileName || `logs-export.${exportMeta.format}`;
    const contentType = CONTENT_TYPES[exportMeta.format];

    const stream = fs.createReadStream(filePath);

    let cleaned = false;
    const cleanup = async () => {
      if (cleaned) return;
      cleaned = true;
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Already removed — nothing to do
      }
      try {
        await redisCacheService.delete(redisKey);
      } catch {
        // best effort
      }
    };

    // Clean up when the entire file has been read by Node.js, with a safety delay for OS flushing
    stream.on("end", () => {
      setTimeout(() => {
        void cleanup();
      }, 1000);
    });

    // Also handle stream errors or premature closes
    stream.on("error", () => {
      void cleanup();
    });
    stream.on("close", () => {
      // Safety backup
      setTimeout(() => {
        void cleanup();
      }, 2000);
    });

    return reply
      .header("Content-Type", contentType)
      .header("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(stream);
  }
}
