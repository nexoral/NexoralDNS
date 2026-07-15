import container from '../../container/appContainer';
import { MongoCollectionManager } from '../../Database/MongoCollectionManager';
import { ObjectId } from 'mongodb';
import { DB_DEFAULT_CONFIGS } from "../../core/key";

import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";

export default class LogsService {
  constructor() { }

  public async getAnalyticalLogs (limit: number | undefined, cursor: string | undefined, query: any, reply: FastifyReply, order?: 'asc' | 'desc') {
    const Analytics = container.get<MongoCollectionManager>('MongoCollectionManager').getCollection(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
    if (!limit) limit = 25
    const sortDirection = order === 'asc' ? 1 : -1;

    if (!Analytics) {
      const ErrorResponse = new BuildResponse(reply, StatusCodes.INTERNAL_SERVER_ERROR, "Database connection error");
      return ErrorResponse.send({ error: "Analytics collection is unavailable" });
    }

    // Build match query with cursor filtering
    const matchQuery: any = query ? { ...query } : {};

    // If cursor is provided, add _id filter to get documents beyond the cursor,
    // walking in whichever direction the sort order goes
    if (cursor) {
      matchQuery._id = sortDirection === 1 ? { $gt: new ObjectId(cursor) } : { $lt: new ObjectId(cursor) };
    }

    // Use single aggregation to get data
    const result = await Analytics.aggregate([
      // Match the query filters including cursor
      { $match: matchQuery },

      // Sort by _id (default newest first; 'asc' walks oldest first)
      { $sort: { _id: sortDirection } },

      // Limit results
      { $limit: limit }
    ]).toArray();

    const AllFilteredData = result || [];

    const Responser = new BuildResponse(reply, AllFilteredData.length !== 0 ? StatusCodes.OK : StatusCodes.NOT_FOUND, "Fetched All Filtered Logs")
    return Responser.send(AllFilteredData)
  }
}