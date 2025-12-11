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

    // Use single aggregation to get both data and count
    const result = await Analytics.aggregate([
      // Match the query filters
      { $match: query ? query : {} },

      // Use facet to get both data and count in parallel
      {
        $facet: {
          data: [
            { $sort: { timestamp: -1 } },
            { $skip: skippable },
            { $limit: limit }
          ],
        }
      }
    ]).toArray();

    const AllFilteredData = result[0]?.data || [];

    return this.Responser.send(AllFilteredData, AllFilteredData.length !== 0 ? StatusCodes.OK : StatusCodes.NOT_FOUND, "Fetched All Filtered Logs")
  }
}