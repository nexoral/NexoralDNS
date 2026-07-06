
import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";
import RedisCache from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";

export default class DefaultTTLService {
  private readonly fastifyReply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  /**
   * Get the current Default TTL value
   * @returns {Promise<void>}
   */
  public async getDefaultTTL(): Promise<void> {
    console.log("Fetching Default TTL...");

    // construct Response
    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Default TTL fetched successfully"
    );

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({
      SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME
    });

    if (!serviceData) {
      throw new Error("Service configuration not found.");
    }

    const defaultTTL = serviceData.DefaultTTL || DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.DefaultTTL;

    console.log(`Current Default TTL: ${defaultTTL} seconds`);

    return Responser.send({
      defaultTTL,
      message: "Default TTL value retrieved successfully"
    });
  }

  /**
   * Update the Default TTL value
   * @param {number} newTTL - New TTL value in seconds (min: 10, max: 86400)
   * @returns {Promise<void>}
   */
  public async updateDefaultTTL(newTTL: number): Promise<void> {
    console.log(`Updating Default TTL to: ${newTTL} seconds`);

    // Validate TTL value
    if (!newTTL || typeof newTTL !== "number") {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "Invalid TTL value"
      );
      return ErrorResponse.send({
        error: "TTL must be a valid number"
      });
    }

    if (newTTL < 10 || newTTL > 86400) {
      const ErrorResponse = new BuildResponse(
        this.fastifyReply,
        StatusCodes.BAD_REQUEST,
        "TTL value out of range"
      );
      return ErrorResponse.send({
        error: "TTL must be between 10 and 86400 seconds (10 seconds to 24 hours)"
      });
    }

    // construct Response
    const Responser = new BuildResponse(
      this.fastifyReply,
      StatusCodes.OK,
      "Default TTL updated successfully"
    );

    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({
      SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME
    });

    if (!serviceData) {
      throw new Error("Service configuration not found.");
    }

    // Delete the Cache After Updating Default TTL
    // This ensures the DNS server picks up the new TTL value
    await RedisCache.delete(CacheKeys.Service_Status);
    await RedisCache.delete("service:config");

    // Update the Default TTL in the database
    await dbClient.updateOne(
      { _id: new ObjectId(serviceData._id) },
      { $set: { DefaultTTL: newTTL } }
    );

    console.log(`Default TTL successfully updated to: ${newTTL} seconds`);

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
