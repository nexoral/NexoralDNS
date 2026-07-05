import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import CacheKeys from "../../Redis/CacheKeys.cache";
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";

export default class CacheService {
  private readonly fastifyReply: FastifyReply
  private Responser: BuildResponse

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply
    this.Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Redis Cache Starts fetched")
  }

  // get Cache Stats
  public async getStats(limit: number, skip: number) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    // Pull Stats
    const stats = await redisCacheService.getStats();
    // Pull Records
    const records = await redisCacheService.getAllRecords(`${CacheKeys.Domain_DNS_Record}*`, limit, skip)

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
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const deletedStat = await redisCacheService.invalidate(`${CacheKeys.Domain_DNS_Record}*`)

    if (deletedStat) {
      return this.Responser.send(deletedStat, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
    }

    this.Responser.send(0, StatusCodes.BAD_REQUEST, "Failed to Delete")
  }


  // Delete specific Key Records
  public async deleteSpecificDNSCache (MatchedKey: string) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    // check if exist or not
    if (await redisCacheService.exists(MatchedKey)){
      if (await redisCacheService.delete(MatchedKey)){
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