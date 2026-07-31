import { logger, QueueKeys, RabbitMQService } from 'nexoraldns-shared';

// mongoDB
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';

export default async function BatchProcessAnalytics() {
  logger.info("Running Batch Process")

  await container.get<RabbitMQService>('RabbitMQService').consumeBatch(QueueKeys.DNS_Analytics, async (messages: any[]) => {
    // Resolved per batch, not once at startup: at cron-start time MongoDB may
    // not be connected yet, and a handle captured then would stay undefined for
    // the process lifetime — every batch would nack and requeue forever.
    const AnalyticsCollection = container
      .get<MongoCollectionManager>('MongoCollectionManager')
      .getCollection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);

    if (!AnalyticsCollection) {
      logger.error("Analytics collection unavailable — requeueing batch");
      return false;
    }

    const currentTimestamp = new Date();
    const messagesWithTimestamps = messages.map((message) => ({
      ...message,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp
    }));

    try {
      const status = await AnalyticsCollection.insertMany(messagesWithTimestamps, { ordered: false });
      return status.acknowledged === true && status.insertedCount > 0;
    } catch (error) {
      logger.error(`❌ Failed to insert analytics batch of ${messages.length}:`, error as any);
      return false;
    }
  }, { batchSize: 1000, batchTimeout: 2000 })

}
