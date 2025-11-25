import { FastifyReply } from "fastify";
import { Console, StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";


// keys import
import { DB_DEFAULT_CONFIGS } from "../../core/key";
// db connections
import { getCollectionClient } from "../../Database/mongodb.db";


export default class DashboardService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }


  // This methood is for fetch dashboard data
  public async getDashboardData(): Promise<void> {
    const AnalyticsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
    const DomainCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS)

    // Response Object
    const ResponseObject = {
      TotalLast24HourDNSqueries: 0,
      totalDomains: 0,
      totalActiveDomains: 0,
      totalDNSRecords: 0,
      LatestLogs: [] as any[],
      totalFailedDNS_Queries: 0,
      totalSuccessDNS_Queries: 0,
      totalForwardedDNS_Queries: 0,
      Percentages: {
        totalFailurePercentage: 0,
        totalSuccessPercentage: 0,
        totalGlobalRequestForwardedPercentage: 0,
      },
      TopGlobalServer: [] as any[],
      avgResponseTimeDuration: 0

    }

    // construct Response
    const Responser = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Dashboard Data retrieved successfully");

    // check if Collections are initilized or not
    if (!AnalyticsCollection || !DomainCollection) {
      Console.red("Collections are not initilized for Dashboard Data fetch...");
      Responser.setMessage("Collections are not initilized for Dashboard Data fetch")
      Responser.setStatusCode(StatusCodes.FORBIDDEN);
      return Responser.send(null);
    }

    // Fetch Last 24 Hours Number of DNS Queries
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const AnalyticsResult = await AnalyticsCollection.aggregate([
      { $match: { timestamp: { $gte: last24Hours }, queryType: { $ne: "Unknown (65)" } } },
      { $count: "totalCount" }
    ]).toArray();
    ResponseObject.TotalLast24HourDNSqueries = AnalyticsResult[0]?.totalCount ?? 0;

    // fetch last 5 logs
    const LatestLogs = await AnalyticsCollection
      .find({
        queryType: { $ne: "Unknown (65)" }
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    ResponseObject.LatestLogs = LatestLogs;

    // fetch total Managed Domain
    const DomainInformation = await DomainCollection.aggregate([
      {
        $lookup: {
          from: DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS,
          localField: "_id",
          foreignField: "domainId",
          as: "records"
        }
      },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          totalActiveDomains: {
            $sum: {
              $cond: [{ $eq: ["$domainStatus", "active"] }, 1, 0]
            }
          },
          totalDNSRecords: { $sum: { $size: "$records" } }
        }
      },
      {
        $project: {
          _id: 0,
          totalDomains: 1,
          totalActiveDomains: 1,
          totalDNSRecords: 1
        }
      }
    ]).toArray();
    ResponseObject.totalActiveDomains = DomainInformation[0]?.totalActiveDomains ?? 0;
    ResponseObject.totalDomains = DomainInformation[0]?.totalDomains ?? 0;
    ResponseObject.totalDNSRecords = DomainInformation[0]?.totalDNSRecords ?? 0;


    // Fetch total Success & total Failed & total Forwarded Request Count
    const RequestDetailsCount = await AnalyticsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours },
          queryType: { $ne: "Unknown (65)" }
        }
      },
      {
        $facet: {
          success: [
            {
              $match: {
                Status: "RESOLVED"
              }
            },
            { $count: "count" }
          ],

          failed: [
            {
              $match: {
                Status: {
                  $in: [
                    "DOMAIN NOT FOUND",
                    "FAILED TO PROCESS",
                    "SERVICE_DOWN"
                  ]
                }
              }
            },
            { $count: "count" }
          ],

          forwarded: [
            {
              $match: {
                Status: "DNS REQUEST FORWARDED"
              }
            },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          success: { $ifNull: [{ $arrayElemAt: ["$success.count", 0] }, 0] },
          failed: { $ifNull: [{ $arrayElemAt: ["$failed.count", 0] }, 0] },
          forwarded: { $ifNull: [{ $arrayElemAt: ["$forwarded.count", 0] }, 0] }
        }
      }
    ]).toArray();
    ResponseObject.totalSuccessDNS_Queries = RequestDetailsCount[0].success ?? 0;
    ResponseObject.totalFailedDNS_Queries = RequestDetailsCount[0].failed ?? 0;
    ResponseObject.totalForwardedDNS_Queries = RequestDetailsCount[0].forwarded ?? 0;

    // Add Percentage data
    ResponseObject.Percentages.totalFailurePercentage =
      Number((((RequestDetailsCount[0].failed ?? 0) / ResponseObject.TotalLast24HourDNSqueries) * 100).toFixed(2));

    ResponseObject.Percentages.totalSuccessPercentage =
      Number((((RequestDetailsCount[0].success ?? 0) / ResponseObject.TotalLast24HourDNSqueries) * 100).toFixed(2));

    ResponseObject.Percentages.totalGlobalRequestForwardedPercentage =
      Number((((RequestDetailsCount[0].forwarded ?? 0) / ResponseObject.TotalLast24HourDNSqueries) * 100).toFixed(2));


    // get Top Global Forwarder Data also 
    const GroupTopGlobalServerData = await AnalyticsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours },
          Status: "DNS REQUEST FORWARDED",
          queryType: { $ne: "Unknown (65)" }
        }
      },
      {
        $group: {
          _id: "$From",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalForwarded: { $sum: "$count" },
          servers: {
            $push: {
              from: "$_id",
              count: "$count"
            }
          }
        }
      },
      { $unwind: "$servers" },
      {
        $project: {
          _id: 0,
          from: "$servers.from",
          count: "$servers.count",
          percentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$servers.count", "$totalForwarded"] },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      { $sort: { percentage: -1 } }
    ]).toArray();
    ResponseObject.TopGlobalServer = GroupTopGlobalServerData;


    const avgDocsTimeDuration = await AnalyticsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours },
          Status: {
            $nin: [
              "DOMAIN NOT FOUND",
              "FAILED TO PROCESS",
              "SERVICE_DOWN"
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" }
        }
      }
    ]).toArray();

    // Convert to toFixed(0)
    ResponseObject.avgResponseTimeDuration = avgDocsTimeDuration[0]?.avgDuration?.toFixed(0);


    // Return the response
    return Responser.send(ResponseObject)
  }

}