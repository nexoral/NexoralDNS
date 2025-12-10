import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";

import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

export class LogsService {
  private readonly fastifyReply: FastifyReply
  private readonly Responser: BuildResponse

  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
    this.Responser = new BuildResponse(this.fastifyReply)
  }

  public async getAnalyticalLogs (limit?: number, page?: number, query?: any) {
    const Analytics = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
    if (!page) page = 1
    if (!limit) limit = 25

    const skippable = (page -1) * limit

    if (!Analytics) {
      return { count: 0, success: 0, failed: 0, forwarded: 0, latestLogs: [], newDomains: 0, newActiveDomains: 0, newRecords: 0 };
    }
    const AllFilteredData = await Analytics.find(query ? query : {}).sort({_id: -1}).skip(skippable).limit(limit).toArray()
    const totalDocument = await Analytics.countDocuments(query ? query : {})

    return this.Responser.send(AllFilteredData.length !== 0 ? { ...AllFilteredData, totalDocument } : [], AllFilteredData.length !== 0 ? StatusCodes.OK : StatusCodes.NOT_FOUND, "Fetched All Filtered Logs")
  }
}