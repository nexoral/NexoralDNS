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

    if (records || stats) {
      // Attach records to whatever stats we have (stats may be null if Redis
      // INFO failed but keys were still enumerable — return records regardless).
      const payload = stats || {};
      if (records) payload.records = records;
      return Responser.send(payload)
    }

    return Responser.send({}, StatusCodes.BAD_REQUEST, "Failed to get Cache Stats")
  }

  // delete all DNS Cache Records Patterns
  public async deleteAllDNSCahce(reply: FastifyReply) {
    const redisCacheService = container.get<RedisCacheService>('RedisCacheService');
    const Responser = new BuildResponse(reply, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
    const deletedStat = await redisCacheService.invalidate(`${CacheKeys.Domain_DNS_Record}*`)

    // 0 matched keys is a legitimate success (nothing to delete), not a failure.
    return Responser.send(deletedStat, StatusCodes.ACCEPTED, "Deleted All Matching Keys");
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
        return Responser.send(false, StatusCodes.NOT_ACCEPTABLE, "Failed to Delete the Cache")
      }
    }
    else {
      return Responser.send(false, StatusCodes.NOT_FOUND, "No Key Matched with this key")
    }
  }
}