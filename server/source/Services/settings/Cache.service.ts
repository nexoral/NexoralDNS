import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import CacheKeys from "../../Redis/CacheKeys.cache";
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";

export default class CacheService {

  constructor() { }

  // get Cache Stats
  public async getStats(limit: number, skip: number, reply: FastifyReply) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Cache Stats retrieved");
    // Pull Stats
    const stats = await redisCacheService.getStats();
    // Pull Records
    const records = await redisCacheService.getAllRecords(`${CacheKeys.Domain_DNS_Record}*`, limit, skip)

    if (records && stats) {
      // Add Records into response
      stats.records = records;
      return Responser.send(stats)
    }
    else if (records) {
      return Responser.send(stats)
    }
    else {
      return Responser.send({}, StatusCodes.BAD_REQUEST, "Failed to get Cache Stats")
    }
  }

  // delete all DNS Cache Records Patterns
  public async deleteAllDNSCahce(reply: FastifyReply) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const Responser = new BuildResponse(reply, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
    const deletedStat = await redisCacheService.invalidate(`${CacheKeys.Domain_DNS_Record}*`)

    if (deletedStat) {
      return Responser.send(deletedStat, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
    }

    return Responser.send(0, StatusCodes.BAD_REQUEST, "Failed to Delete")
  }


  // Delete specific Key Records
  public async deleteSpecificDNSCache (MatchedKey: string, reply: FastifyReply) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const Responser = new BuildResponse(reply, StatusCodes.OK, "Cache operation");
    // check if exist or not
    if (await redisCacheService.exists(MatchedKey)){
      if (await redisCacheService.delete(MatchedKey)){
        return Responser.send(true, StatusCodes.ACCEPTED, "Deleted the key from Cache")
      }
      else {
        return Responser.send(false, StatusCodes.NOT_ACCEPTABLE, "Faled to Delete the Cache")
      }
    }
    else {
      return Responser.send(false, StatusCodes.NOT_FOUND, "No Key Matched with this key")
    }

    return Responser.send(false, StatusCodes.NOT_FOUND, "Failed to Delete the Cache")
  }
}