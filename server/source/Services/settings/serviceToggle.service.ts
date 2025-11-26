
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


export default class ServiceToggleService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }

  // Toggle a service's active status
  public async toggleService(): Promise<void> {
    console.log("Toggling service status...");
    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Service updated Successful");
    const dbClient = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
    if (!serviceData) {
      throw new Error("Service not found.");
    }

    const newStatus = serviceData.Service_Status === "active" ? "inactive" : "active";

    // Delete the Cache After Update Service Status
    RedisCache.delete(CacheKeys.Service_Status);

    await dbClient.updateOne(
      { _id: new ObjectId(serviceData._id) },
      { $set: { Service_Status: newStatus } }
    );

    console.log(`Service status updated to: ${newStatus}`);

    return Responser.send({ Service_Status: newStatus });
  }
}