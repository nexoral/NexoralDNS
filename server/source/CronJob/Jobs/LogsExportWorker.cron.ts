import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import { Console } from "outers";
import { QueueKeys } from "../../Redis/CacheKeys.cache";
import { RedisCacheService } from "../../Redis/Redis.cache";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { buildLogsQuery } from "../../helper/buildLogsQuery.helper";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RabbitMQService } from "../../RabbitMQ/Rabbitmq.config";
import { LogExportJobMessage, LogExportMetadata } from "../../Services/Logs/LogsExport.service";

const EXPORTS_DIR = path.join(__dirname, "..", "..", "..", "exports");
const BATCH_SIZE = 1000;

// Column set matches the fields the Logs page actually filters/displays on
const EXPORT_COLUMNS = ["timestamp", "queryName", "SourceIP", "Status", "duration"] as const;

function ensureExportsDir(): void {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function* scrollAnalytics(query: Record<string, any>): AsyncGenerator<any[]> {
  const analyticsCol = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
  if (!analyticsCol) throw new Error("Analytics collection not initialized");

  let cursorId: ObjectId | undefined;
  for (; ;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchQuery: Record<string, any> = { ...query };
    if (cursorId) matchQuery._id = { $lt: cursorId };

    const batch = await analyticsCol
      .find(matchQuery)
      .sort({ _id: -1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (batch.length === 0) return;

    yield batch;
    cursorId = batch[batch.length - 1]._id;

    if (batch.length < BATCH_SIZE) return;
  }
}

async function writeTxt(filePath: string, query: Record<string, unknown>): Promise<void> {
  const writeStream = fs.createWriteStream(filePath);

  const write = (chunk: string): Promise<void> => {
    return new Promise((resolve) => {
      if (writeStream.write(chunk)) {
        resolve();
      } else {
        writeStream.once("drain", resolve);
      }
    });
  };

  for await (const batch of scrollAnalytics(query)) {
    for (const doc of batch) {
      const timestamp = doc.timestamp ? new Date(doc.timestamp).toISOString() : "N/A";
      const SourceIP = doc.SourceIP ?? "N/A";
      const Status = doc.Status ?? "N/A";
      const duration = doc.duration != null ? `${doc.duration}ms` : "N/A";
      const queryName = doc.queryName ?? "N/A";

      const line = `[${timestamp}] ${SourceIP} ${Status} (${duration}) - ${queryName}\n`;
      await write(line);
    }
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: NodeJS.ErrnoException | null | undefined) => (err ? reject(err) : resolve()));
  });
}

// ExcelJS writing removed as only plain text AI-oriented exports are supported now.

/**
 * Long-running RabbitMQ consumer for log export jobs — registered at boot
 * alongside the other workers in CronJob.ts, same shape as BatchAnalytics.cron.ts.
 */
export default async function LogsExportWorker() {
  ensureExportsDir();
  const rabbitMQService = container.get<RabbitMQService>('RabbitMQService');
  const redisCacheService = container.get<RedisCacheService>('RedisCacheService');

  await rabbitMQService.consume(QueueKeys.LOGS_EXPORT, async (job: LogExportJobMessage): Promise<boolean> => {
    const redisKey = `log-export:${job.userId}`;

    try {
      const existing = await redisCacheService.get<LogExportMetadata>(redisKey);
      if (existing) {
        existing.status = "processing";
        await redisCacheService.set(redisKey, existing, 24 * 60 * 60);
      }

      const query = buildLogsQuery(job.filters);
      const fileName = `logs-export-${job.jobId}.${job.format}`;
      const filePath = path.join(EXPORTS_DIR, fileName);

      await writeTxt(filePath, query);

      if (existing) {
        existing.status = "ready";
        existing.readyAt = Date.now();
        existing.filePath = filePath;
        existing.fileName = fileName;
        await redisCacheService.set(redisKey, existing, 24 * 60 * 60);
      }

      Console.green(`[LogsExport] Export ${job.jobId} ready for user ${job.userId}`);
      return true;
    } catch (error) {
      Console.red(`[LogsExport] Failed to process export ${job.jobId}:`, error);
      try {
        const existing = await redisCacheService.get<LogExportMetadata>(redisKey);
        if (existing) {
          existing.status = "failed";
          existing.error = error instanceof Error ? error.message : "Unknown error";
          await redisCacheService.set(redisKey, existing, 24 * 60 * 60);
        }
      } catch {
        // best effort
      }
      // Acknowledge (don't requeue) — a failed export shouldn't retry forever against the same bad filters
      return true;
    }
  });
}
