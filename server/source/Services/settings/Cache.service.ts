import RedisCache from "../../Redis/Redis.cache";

import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import CacheKeys from "../../Redis/CacheKeys.cache";


export default class CacheService {
  private readonly RedisCache: typeof RedisCache
  private readonly fastifyReply: FastifyReply
  private Responser: BuildResponse

  constructor(reply: FastifyReply) {
    this.RedisCache = RedisCache;
    this.fastifyReply = reply
    this.Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Redis Cache Starts fetched")
  }

  // get Cache Stats
  public async getStats(limit: number, skip: number) {
    // Pull Stats
    const stats = await this.RedisCache.getStats();
    // Pull Records
    const records = await this.RedisCache.getAllRecords(`${CacheKeys.Domain_DNS_Record}*`, limit, skip)

    if (records && stats) {
      // Add Records into response
      stats.records = records;
      return this.Responser.send(stats)
    }
    else if (records) {
      return this.Responser.send(stats)
    }
    else {
      return this.Responser.send({}, StatusCodes.BAD_REQUEST, "Failed to get Cache Stats")
    }
  }

  // delete all DNS Cache Records Patterns
  public async deleteAllDNSCahce() {
    const deletedStat = await this.RedisCache.invalidate(`${CacheKeys.Domain_DNS_Record}*`)

    if (deletedStat) {
      return this.Responser.send(deletedStat, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
    }

    this.Responser.send(0, StatusCodes.BAD_REQUEST, "Failed to Delete")
  }


  // Delete specific Key Records
  public async deleteSpecificDNSCache (MatchedKey: string) {
    // check if exist or not
    if (await this.RedisCache.exists(MatchedKey)){
      if (await this.RedisCache.delete(MatchedKey)){
        return this.Responser.send(true, StatusCodes.ACCEPTED, "Deleted the key from Cache")
      }
      else {
        return this.Responser.send(false, StatusCodes.NOT_ACCEPTABLE, "Faled to Delete the Cache")
      }
    }
    else {
      return this.Responser.send(false, StatusCodes.NOT_FOUND, "No Key Matched with this key")
    }

    return this.Responser.send(false, StatusCodes.NOT_FOUND, "Failed to Delete the Cache")
  }
}