import logger from '../../utilities/logger';
import fs from "fs";
import path from "path";
import { Retry } from "outers";

const EXPORTS_DIR = path.join(__dirname, "..", "..", "..", "exports");
const STALE_READY_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Safety net for log export files that were never downloaded.
 * Directly sweeps the exports directory and unlinks files older than 24 hours.
 */
async function cleanupStaleExports(): Promise<void> {
  if (!fs.existsSync(EXPORTS_DIR)) return;

  try {
    const files = await fs.promises.readdir(EXPORTS_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(EXPORTS_DIR, file);
      try {
        const stats = await fs.promises.stat(filePath);
        const age = now - stats.mtimeMs;
        if (age > STALE_READY_MS) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        logger.error(`[CleanupExports] Failed to stat or unlink ${file}:`, error);
      }
    }

    if (deletedCount > 0) {
      logger.info(`[CleanupExports] Cleared ${deletedCount} stale log export file(s)`);
    }
  } catch (error) {
    logger.error("[CleanupExports] Failed to read exports directory:", error);
  }
}

export const CleanupExportsCronJob = () => {
  Retry.Seconds(async () => {
    try {
      await cleanupStaleExports();
    } catch (error) {
      logger.error("[CleanupExports] Error during cleanup sweep:", error);
    }
  }, 60 * 60, false); // Every hour, no need to run immediately on boot
};
