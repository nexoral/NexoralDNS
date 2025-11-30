import { Retry } from "outers";
import { DB_DEFAULT_CONFIGS } from "../core/key";
import { getCollectionClient } from "../Database/mongodb.db";
import CacheKeys from "../Redis/CacheKeys.cache";
import RedisCache from "../Redis/Redis.cache";


// ainn Function to Load the Dashboard Data
export async function getDashboardDataStats(): Promise<object> {
  const Analytics = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);
  const Domains = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DOMAINS);
  const DNSRecords = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_RECORDS);
  const last24 = Date.now() - 24 * 60 * 60 * 1000;

  if (!Analytics || !Domains || !DNSRecords ){
    throw new Error("Collection not initilized")
  }

  const [
    totalCount24h,
    latestLogs,
    domainStats,
    groupedStatus,
    topForwardersRaw,
    avgDurationRaw
  ] = await Promise.all([

    // Total number of queries in last 24h
    Analytics.aggregate([
      { $match: { timestamp: { $gte: last24 }, queryType: { $ne: "Unknown (65)" } } },
      { $count: "count" }
    ]).toArray(),
    

    // Last 10 DNS logs (include all properties you showed)
    Analytics.find(
      { queryType: { $ne: "Unknown (65)" } },
      { projection: { queryName: 1, queryType: 1, SourceIP: 1, timestamp: 1, Status: 1, From: 1, duration: 1 } }
    )
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray(),

    // Domain Stats — no heavy lookup
    (async () => {
      const totalDomains = await Domains.countDocuments({});
      const active = await Domains.countDocuments({ domainStatus: "active" });
      const records = await DNSRecords.estimatedDocumentCount();
      return { totalDomains, active, records };
    })(),

    // Success / Failed / Forwarded counts — single pass
    Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: last24 },
          queryType: { $ne: "Unknown (65)" }
        }
      },
      {
        $group: {
          _id: "$Status",
          count: { $sum: 1 }
        }
      }
    ]).toArray(),

    // Top forwarders with counts
    Analytics.aggregate([
      { $match: { timestamp: { $gte: last24 }, Status: "DNS REQUEST FORWARDED" } },
      { $group: { _id: "$From", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray(),

    // Average duration for successful queries
    Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: last24 },
          Status: { $eq: "RESOLVED" }
        }
      },
      { $group: { _id: null, avg: { $avg: "$duration" } } }
    ]).toArray()
  ]);

  const totalQueriesLast24 = totalCount24h[0]?.count ?? 0;

  let success = 0, failed = 0, forwarded = 0;

  for (const entry of groupedStatus) {
    if (entry._id === "RESOLVED") success = entry.count;
    else if (entry._id === "DNS REQUEST FORWARDED") forwarded = entry.count;
    else if (["DOMAIN NOT FOUND", "FAILED TO PROCESS", "SERVICE_DOWN"].includes(entry._id))
      failed += entry.count;
  }

  const totalForward = forwarded || 1; // avoid division by zero

  const topForwarders = topForwardersRaw.map(f => ({
    from: f._id,
    count: f.count,
    percentage: Number(((f.count / totalForward) * 100).toFixed(2))
  }));


  const response = {
    TotalLast24HourDNSqueries: totalQueriesLast24,

    totalDomains: domainStats.totalDomains,
    totalActiveDomains: domainStats.active,
    totalDNSRecords: domainStats.records,

    LatestLogs: latestLogs,

    totalFailedDNS_Queries: failed,
    totalSuccessDNS_Queries: success,
    totalForwardedDNS_Queries: forwarded,

    Percentages: {
      totalFailurePercentage: totalQueriesLast24 ? Number(((failed / totalQueriesLast24) * 100).toFixed(2)) : 0,
      totalSuccessPercentage: totalQueriesLast24 ? Number(((success / totalQueriesLast24) * 100).toFixed(2)) : 0,
      totalGlobalRequestForwardedPercentage: totalQueriesLast24 ? Number(((forwarded / totalQueriesLast24) * 100).toFixed(2)) : 0
    },

    TopGlobalServer: topForwarders,

    avgResponseTimeDuration: avgDurationRaw[0]?.avg?.toFixed(0) ?? "0",

    computedAt: Date.now() // Timestamp when base stats were computed
  };

  // Set in Cache (10 min TTL to ensure overlap with cron)
  await RedisCache.set(CacheKeys.DashboardAnaliticalData, response, 1800);

  return response;
}


// Export the Cron Job to Cron Controller
export const DashboardAnaliticalStatCronJob = () => {
  Retry.Seconds(async () => {
    await getDashboardDataStats();
  }, 300, true);
}