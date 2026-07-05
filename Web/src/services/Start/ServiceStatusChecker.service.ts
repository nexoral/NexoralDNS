/* eslint-disable @typescript-eslint/no-explicit-any */
import { Console } from "outers";
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { IDNSIOHandler } from "../../utilities/IDNSIOHandler";
import dgram from "dgram";

// Cache Settings
import container from "../../container/appContainer";
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { RedisCacheService } from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";

export type ServiceStatusResult = {
  serviceStatus: boolean,
  serviceConfig: any | null
}


export default class ServiceStatusChecker {

  /**
   * Check if the service is active
   * @param queryName 
   * @param IO InputOutputHandler instance
   * @param msg DNS query message buffer
   * @param rinfo Remote info of the requester
   * @returns ServiceStatusResult
   */
  public async checkServiceStatus(
    queryName: string,
    IO: IDNSIOHandler,
    msg: Buffer<ArrayBufferLike>,
    rinfo: dgram.RemoteInfo
  ): Promise<ServiceStatusResult> {
    // Check Redis Cache first
    const serviceStatusCache = await container.get<RedisCacheService>('RedisCacheService').get(CacheKeys.Service_Status);

    // If cache exists, use it
    if (serviceStatusCache !== null) {
      if (serviceStatusCache.Service_Status !== "active") {
        Console.red("Service is inactive (from cache). DNS query processing is halted.");
        IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10); // Respond with NXDOMAIN
        return {
          serviceStatus: false,
          serviceConfig: serviceStatusCache
        };
      }
      else {
        return {
          serviceStatus: true,
          serviceConfig: serviceStatusCache
        };
      }
    }

    const serviceCollection = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.SERVICE)
    if (!serviceCollection) {
      Console.red("Service collection not found in the database.");
      return {
        serviceStatus: false,
        serviceConfig: null
      };
    }

    const serviceConfig = await serviceCollection.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });


    if (!serviceConfig) {
      Console.red("Service configuration not found in the database.");
      return {
        serviceStatus: false,
        serviceConfig: null
      };
    }

    await container.get<RedisCacheService>('RedisCacheService').set(CacheKeys.Service_Status, serviceConfig);
    if (serviceConfig.Service_Status !== "active") {
      Console.red("Service is inactive. DNS query processing is halted.");
      IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", serviceConfig.DefaultTTL ? serviceConfig.DefaultTTL : 10); // Respond with NXDOMAIN
      return {
        serviceStatus: false,
        serviceConfig: serviceConfig
      };
    }
    else {
      return {
        serviceStatus: true,
        serviceConfig: serviceConfig
      };
    }
  }
}