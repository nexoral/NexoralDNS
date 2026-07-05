import { getMongoClient } from "../../Database/mongodb.db";
import container from "../../container/appContainer";
import { RabbitMQService } from "../../RabbitMQ/Rabbitmq.config";
import { RedisCacheService } from "../../Redis/Redis.cache";

/**
 * Service class to check the health of the application and its dependencies.
 * 
 * @export
 * @class HealthService
 */
export default class HealthService {
  static async checkHealth(): Promise<any> {
    const health: Record<string, any> = {
      status: "ok",
      timestamp: new Date().toISOString(),
      details: {},
    };

    let isHealthy = true;

    // 1. MongoDB Check
    try {
      const client = getMongoClient();
      await client.db().command({ ping: 1 });
      health.details.mongodb = "healthy";
    } catch (err: any) {
      isHealthy = false;
      health.details.mongodb = `unhealthy: ${err.message || err}`;
    }

    // 2. Redis Check
    try {
      const redisConnectionManager = container.get<any>('RedisConnectionManager');
      const client = await redisConnectionManager.getClient();
      await client.ping();
      health.details.redis = "healthy";
    } catch (err: any) {
      isHealthy = false;
      health.details.redis = `unhealthy: ${err.message || err}`;
    }

    // 3. RabbitMQ Check
    try {
      const channel = await container.get<RabbitMQService>('RabbitMQService').connect();
      if (channel) {
        health.details.rabbitmq = "healthy";
      } else {
        throw new Error("No RabbitMQ channel available");
      }
    } catch (err: any) {
      isHealthy = false;
      health.details.rabbitmq = `unhealthy: ${err.message || err}`;
    }

    if (!isHealthy) {
      health.status = "unhealthy";
    }

    return health;
  }
}