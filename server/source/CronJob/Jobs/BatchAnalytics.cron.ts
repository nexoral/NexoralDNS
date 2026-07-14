import logger from '../../utilities/logger';
import { QueueKeys, RabbitMQService } from "nexoraldns-shared";

// mongoDB
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";

export default async function BatchProcessAnalytics() {
  const AnalyticsCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);

  // Handle the Initilization Error
  if (!AnalyticsCollection) {
    logger.error("Collection is not Initilized Yet...")
  }

  logger.info("Running Batch Process")
  await container.get<RabbitMQService>('RabbitMQService').consumeBatch(QueueKeys.DNS_Analytics, async (messages: any[]) => {
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