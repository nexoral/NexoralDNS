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

  public async getStats () {
    const starts = await this.RedisCache.getStats();
    const records = await this.RedisCache.getAllRecords(`${CacheKeys.Domain_DNS_Record}*`)

    starts.records = records;
      return this.Responser.send(starts)
  }

}