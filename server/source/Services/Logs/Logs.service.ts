import { ObjectId } from 'mongodb';
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

  public async getAnalyticalLogs (limit?: number, cursor?: string, query?: any) {
    const Analytics = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
    if (!limit) limit = 25

    if (!Analytics) {
      return { count: 0, success: 0, failed: 0, forwarded: 0, latestLogs: [], newDomains: 0, newActiveDomains: 0, newRecords: 0 };
    }

    // Build match query with cursor filtering
    const matchQuery: any = query ? { ...query } : {};

    // If cursor is provided, add _id filter to get documents after the cursor
    if (cursor) {
      matchQuery._id = { $lt: new ObjectId(cursor) };
    }

    // Use single aggregation to get data
    const result = await Analytics.aggregate([
      // Match the query filters including cursor
      { $match: matchQuery },

      // Sort by _id descending (newest first)
      { $sort: { _id: -1 } },

      // Limit results
      { $limit: limit }
    ]).toArray();

    const AllFilteredData = result || [];

    return this.Responser.send(AllFilteredData, AllFilteredData.length !== 0 ? StatusCodes.OK : StatusCodes.NOT_FOUND, "Fetched All Filtered Logs")
  }
}