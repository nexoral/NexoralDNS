import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import RedisCache from "../../Redis/Redis.cache";

import CacheKeys from "../../Redis/CacheKeys.cache";
import { getDashboardDataStats } from "../../CronJob/DashboardAnalytics.cron";


export default class DashboardService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }


  // This methood is for fetch dashboard data
  public async getDashboardData(): Promise<void> {
    const Res = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Dashboard Data retrieved successfully");

    // Check in Cache
    const cacheData = await RedisCache.get(CacheKeys.DashboardAnaliticalData)
    if (cacheData){
      Res.send(cacheData);
    }

    const DashboardData = await getDashboardDataStats();
    return Res.send(DashboardData);
  }



}