import logger from '../../utilities/logger';

import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { ObjectId } from "mongodb";
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import { CacheKeys } from "nexoraldns-shared";

export default class DefaultTTLService {

  constructor() { }

  /**
   * Get the current Default TTL value
   * @returns {Promise<void>}
   */
  public async getDefaultTTL(reply: FastifyReply): Promise<void> {
    logger.info("Fetching Default TTL...");

    // construct Response
    const Responser = new BuildResponse(
      reply,
      StatusCodes.OK,
      "Default TTL fetched successfully"
    );

    const dbClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({
      SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME
    });

    if (!serviceData) {
      throw new Error("Service configuration not found.");
    }

    const defaultTTL = serviceData.DefaultTTL !== undefined ? serviceData.DefaultTTL : DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.DefaultTTL;

    logger.info(`Current Default TTL: ${defaultTTL} seconds`);

    return Responser.send({
      defaultTTL,
      message: "Default TTL value retrieved successfully"
    });
  }

  /**
   * Update the Default TTL value
   * @param {number} newTTL - New TTL value in seconds (min: 0, max: 86400).
   *   0 is valid and means "do not cache" — used for instant block/unblock toggling.
   * @returns {Promise<void>}
   */
  public async updateDefaultTTL(newTTL: number, reply: FastifyReply): Promise<void> {
    logger.info(`Updating Default TTL to: ${newTTL} seconds`);

    // Validate TTL value
    if (typeof newTTL !== "number" || isNaN(newTTL)) {
      const ErrorResponse = new BuildResponse(
        reply,
        StatusCodes.BAD_REQUEST,
        "Invalid TTL value"
      );
      return ErrorResponse.send({
        error: "TTL must be a valid number"
      });
    }

    if (newTTL < 0 || newTTL > 86400) {
      const ErrorResponse = new BuildResponse(
        reply,
        StatusCodes.BAD_REQUEST,
        "TTL value out of range"
      );
      return ErrorResponse.send({
        error: "TTL must be between 0 and 86400 seconds (0 seconds to 24 hours)"
      });
    }

    // construct Response
    const Responser = new BuildResponse(
      reply,
      StatusCodes.OK,
      "Default TTL updated successfully"
    );

    const dbClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({
      SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME
    });

    if (!serviceData) {
      throw new Error("Service configuration not found.");
    }

    // Update the Default TTL in the database
    await dbClient.updateOne(
      { _id: new ObjectId(serviceData._id) },
      { $set: { DefaultTTL: newTTL } }
    );

    // Proactively set Redis caches to the new TTL so the DNS engine picks it up instantly
    const updatedServiceData = { ...serviceData, DefaultTTL: newTTL };
    await container.get<RedisCacheService>('RedisCacheService').set(CacheKeys.Service_Status, updatedServiceData);
    await container.get<RedisCacheService>('RedisCacheService').set("service:config", updatedServiceData);

    logger.info(`Default TTL successfully updated to: ${newTTL} seconds`);

    return Responser.send({
      defaultTTL: newTTL,
      message: `Default TTL updated to ${newTTL} seconds. This applies to blocked domains and domain forwarder requests.`,
      appliesTo: [
        "Blocked domains",
        "Domain forwarder requests (queries forwarded to upstream DNS)"
      ],
      note: "Custom domains use their own TTL set at creation time"
    });
  }
}
