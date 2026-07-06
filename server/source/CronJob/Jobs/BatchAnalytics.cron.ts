import logger from '../../utilities/logger';
import RabbitMQService from "../../RabbitMQ/Rabbitmq.config";
import { QueueKeys } from "../../Redis/CacheKeys.cache";

// mongoDB
import { getCollectionClient } from "../../Database/mongodb.db";
import { DB_DEFAULT_CONFIGS } from "../../core/key";

export default async function BatchProcessAnalytics() {
  const AnalyticsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);

  // Handle the Initilization Error
  if (!AnalyticsCollection) {
    logger.error("Collection is not Initilized Yet...")
  }

  logger.info("Running Batch Process")
  await RabbitMQService.consumeBatch(QueueKeys.DNS_Analytics, async (messages: any[]) => {
    logger.info("Batch", messages)
    const currentTimestamp = new Date();
    const messagesWithTimestamps = messages.map((message) => ({
      ...message,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp
    }));
    const status = await AnalyticsCollection?.insertMany(messagesWithTimestamps);
    if (status?.acknowledged == true && status.insertedCount !== 0) {
      return true
    }
    return false;
  }, { batchSize: 1000, batchTimeout: 2000 })

}
