
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
import { logger, CacheKeys } from 'nexoraldns-shared';

// Bounds for the DNS record TTL an operator may set.
//
// The floor exists because a near-zero TTL defeats the record cache: entries
// expire before they can be reused, every miss forwards upstream, and the
// public resolvers throttle the whole LAN.
const MIN_DEFAULT_TTL = 10;
const MAX_DEFAULT_TTL = 86400;

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
   * @param {number} newTTL - New TTL value in seconds (min: 10, max: 86400).
   *   Values below 10 are rejected: they expire the record cache faster than it
   *   can be reused, so every query forwards upstream and the public resolvers
   *   rate-limit the LAN. Use the block list for instant on/off, not a low TTL.
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

    // The floor is 10s, not 0. A very low TTL expires the record cache almost
    // immediately, so every client re-asks constantly and each miss forwards to
    // the public resolvers — which then rate-limit the whole LAN. A value of 1
    // was enough to push a 46% cache hit rate and trip every upstream breaker.
    if (newTTL < MIN_DEFAULT_TTL || newTTL > MAX_DEFAULT_TTL) {
      const ErrorResponse = new BuildResponse(
        reply,
        StatusCodes.BAD_REQUEST,
        "TTL value out of range"
      );
      return ErrorResponse.send({
        error: `TTL must be between ${MIN_DEFAULT_TTL} and ${MAX_DEFAULT_TTL} seconds (10 seconds to 24 hours)`
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
