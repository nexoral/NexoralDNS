/* eslint-disable @typescript-eslint/no-explicit-any */
import { Console } from "outers";
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";

// Cache Settings
import RedisCache from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";

export type ServiceStatusResult = {
  serviceStatus: boolean,
  serviceConfig: any | null
}


export default class ServiceStatusChecker {
  private readonly IO: InputOutputHandler;
  private readonly msg: Buffer<ArrayBufferLike>;
  private readonly rinfo: dgram.RemoteInfo;

  constructor(IO: InputOutputHandler, msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo) {
    this.IO = IO
    this.msg = msg
    this.rinfo = rinfo
   }

  /**
   * Check if the service is active
   * @param queryName 
   * @returns boolean
   */
  public async checkServiceStatus(queryName: string): Promise<ServiceStatusResult> {
    // Check Redis Cache first
    const serviceStatusCache = await RedisCache.get(CacheKeys.Service_Status);

    // If cache exists, use it
    if (serviceStatusCache !== null) {
      if (serviceStatusCache.Service_Status !== "active") {
        Console.red("Service is inactive (from cache). DNS query processing is halted.");
        this.IO.buildSendAnswer(this.msg, this.rinfo, queryName, "0.0.0.0", 10); // Respond with NXDOMAIN
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

    const serviceCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE)
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

    await RedisCache.set(CacheKeys.Service_Status, serviceConfig);
    if (serviceConfig.Service_Status !== "active") {
      Console.red("Service is inactive. DNS query processing is halted.");
      this.IO.buildSendAnswer(this.msg, this.rinfo, queryName, "0.0.0.0", serviceConfig.DefaultTTL ? serviceConfig.DefaultTTL : 10); // Respond with NXDOMAIN
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