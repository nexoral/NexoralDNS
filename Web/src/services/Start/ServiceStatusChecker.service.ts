import { Console } from "outers";
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";

// Cache Settings
import RedisCache from "../../Redis/Redis.cache";
import CacheKeys from "../../Redis/CacheKeys.cache";

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
  public async checkServiceStatus(queryName: string) {
    // Check Redis Cache first
    const serviceStatusCache = await RedisCache.get(CacheKeys.Service_Status);

    // If cache exists, use it
    if (serviceStatusCache !== null) {
      if (!serviceStatusCache) {
        Console.red("Service is inactive (from cache). DNS query processing is halted.");
        this.IO.buildSendAnswer(this.msg, this.rinfo, queryName, "0.0.0.0", 5); // Respond with NXDOMAIN
        return false;
      }
      else {
        return true;
      }
    }

    const serviceCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE)
    if (!serviceCollection) {
      Console.red("Service collection not found in the database.");
      return false;
    }

    const serviceConfig = await serviceCollection.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });


    if (!serviceConfig) {
      Console.red("Service configuration not found in the database.");
      return false;
    }

    if (serviceConfig.Service_Status !== "active") {
      Console.red("Service is inactive. DNS query processing is halted.");
      this.IO.buildSendAnswer(this.msg, this.rinfo, queryName, "0.0.0.0", 5); // Respond with NXDOMAIN
      await RedisCache.set(CacheKeys.Service_Status, false);
      return false;
    }
    else {
      await RedisCache.set(CacheKeys.Service_Status, true);
      return true;
    }
  }
}