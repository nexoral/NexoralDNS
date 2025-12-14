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
  public async getStats (limit: number, skip: number) {
    // Pull Stats
    const starts = await this.RedisCache.getStats();
    // Pull Records
    const records = await this.RedisCache.getAllRecords(`${CacheKeys.Domain_DNS_Record}*`, limit, skip)

    // Add Records into response
      starts.records = records;
    return this.Responser.send(starts)
  }

}