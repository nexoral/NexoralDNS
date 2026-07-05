
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
import CacheKeys from "../../Redis/CacheKeys.cache";


export default class ServiceToggleService {
  constructor() { }

  // Toggle a service's active status
  public async toggleService(reply: FastifyReply): Promise<void> {
    console.log("Toggling service status...");
    // construct Response
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Service updated Successful");
    const dbClient = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    if (!dbClient) {
      throw new Error("Database connection error.");
    }

    const serviceData = await dbClient.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });
    if (!serviceData) {
      throw new Error("Service not found.");
    }

    const newStatus = serviceData.Service_Status === "active" ? "inactive" : "active";

    // Update MongoDB first (source of truth)
    await dbClient.updateOne(
      { _id: new ObjectId(serviceData._id) },
      { $set: { Service_Status: newStatus } }
    );

    // Proactively set Redis to new status so DNS engine picks it up instantly
    const updatedServiceData = {
      ...serviceData,
      Service_Status: newStatus,
    };
    await container.get<RedisCacheService>('RedisCacheService').set(CacheKeys.Service_Status, updatedServiceData);

    console.log(`Service status updated to: ${newStatus}`);

    return Responser.send({ serviceStatus: newStatus });
  }
}