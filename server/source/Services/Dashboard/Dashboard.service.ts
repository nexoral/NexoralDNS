import { FastifyReply } from "fastify";
import { StatusCodes } from "outers";
import BuildResponse from "../../helper/responseBuilder.helper";
import RedisCache from "../../Redis/Redis.cache";

import CacheKeys from "../../Redis/CacheKeys.cache";
import { getDashboardDataStats } from "../../CronJob/DashboardAnalytics.cron";
import { DB_DEFAULT_CONFIGS } from "../../core/key";
import { getCollectionClient } from "../../Database/mongodb.db";


export default class DashboardService {
  private readonly fastifyReply: FastifyReply
  constructor(reply: FastifyReply) {
    this.fastifyReply = reply;
  }


  // This methood is for fetch dashboard data
  public async getDashboardData(): Promise<void> {
    const Res = new BuildResponse(this.fastifyReply, StatusCodes.OK, "Dashboard Data retrieved successfully");

    // Get base stats from cache (computed by cron every ~5 min)
    const baseStats: any = await RedisCache.get(CacheKeys.DashboardAnaliticalData);

    // If no base stats, compute full stats (first run or cache expired)
    if (!baseStats || !baseStats.computedAt) {
      const DashboardData = await getDashboardDataStats();
      return Res.send(DashboardData);
    }

    // Calculate delta (new data since base was computed)
    const delta = await this.getDeltaStats(baseStats.computedAt);

    // Merge base + delta for real-time stats
    const realtimeStats = this.mergeStats(baseStats, delta);

    return Res.send(realtimeStats);
  }

  // Calculate delta stats for data since last base computation
  private async getDeltaStats(since: number): Promise<any> {
    const Analytics = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.ANALYTICS);

    if (!Analytics) {
      return { count: 0, success: 0, failed: 0, forwarded: 0, latestLogs: [] };
    }

    const [
      deltaCount,
      latestLogs,
      deltaStatus,
      deltaForwarders,
      deltaAvgDuration
    ] = await Promise.all([
      // New queries count since base computation
      Analytics.aggregate([
        { $match: { timestamp: { $gte: since, $lte: Date.now() }} },
        { $count: "count" }
      ]).toArray(),

      // Latest 10 logs (always fetch fresh)
      Analytics.find(
        {},
        { projection: { queryName: 1, queryType: 1, SourceIP: 1, timestamp: 1, Status: 1, From: 1, duration: 1 } }
      )
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray(),

      // Delta status counts
      Analytics.aggregate([
        { $match: { timestamp: { $gte: since, $lte: Date.now() } } },
        { $group: { _id: "$Status", count: { $sum: 1 } } }
      ]).toArray(),

      // Delta forwarders
      Analytics.aggregate([
        { $match: { timestamp: { $gte: since, $lte: Date.now() }, Status: "DNS REQUEST FORWARDED" } },
        { $group: { _id: "$From", count: { $sum: 1 } } }
      ]).toArray(),

      // Delta avg duration
      Analytics.aggregate([
        { $match: { timestamp: { $gte: since, $lte: Date.now() }, Status: { $eq: "RESOLVED" } } },
        { $group: { _id: null, avg: { $avg: "$duration" }, count: { $sum: 1 } } }
      ]).toArray()
    ]);

    let success = 0, failed = 0, forwarded = 0;
    for (const entry of deltaStatus) {
      if (entry._id === "RESOLVED") success = entry.count;
      else if (entry._id === "DNS REQUEST FORWARDED") forwarded = entry.count;
      else if (["DOMAIN NOT FOUND", "FAILED TO PROCESS", "SERVICE_DOWN"].includes(entry._id))
        failed += entry.count;
    }

    return {
      count: deltaCount[0]?.count ?? 0,
      success,
      failed,
      forwarded,
      latestLogs,
      forwarders: deltaForwarders,
      avgDuration: deltaAvgDuration[0]?.avg ?? 0,
      resolvedCount: deltaAvgDuration[0]?.count ?? 0
    };
  }

  // Merge base stats with delta for real-time view
  private mergeStats(base: any, delta: any): any {
    // Merge counts
    const totalQueries = base.TotalLast24HourDNSqueries + delta.count;
    const totalSuccess = base.totalSuccessDNS_Queries + delta.success;
    const totalFailed = base.totalFailedDNS_Queries + delta.failed;
    const totalForwarded = base.totalForwardedDNS_Queries + delta.forwarded;

    // Merge top forwarders
    const forwarderMap = new Map();
    for (const f of base.TopGlobalServer) {
      forwarderMap.set(f.from, f.count);
    }
    for (const f of delta.forwarders) {
      forwarderMap.set(f._id, (forwarderMap.get(f._id) || 0) + f.count);
    }

    const totalForward = totalForwarded || 1;
    const topForwarders = Array.from(forwarderMap.entries())
      .map(([from, count]) => ({
        from,
        count,
        percentage: Number(((count / totalForward) * 100).toFixed(2))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Merge avg duration (weighted average)
    const baseAvg = parseFloat(base.avgResponseTimeDuration) || 0;
    const baseWeight = base.totalSuccessDNS_Queries;
    const deltaAvg = delta.avgDuration;
    const deltaWeight = delta.resolvedCount;
    const totalWeight = baseWeight + deltaWeight;
    const mergedAvg = totalWeight > 0
      ? ((baseAvg * baseWeight) + (deltaAvg * deltaWeight)) / totalWeight
      : 0;

    return {
      TotalLast24HourDNSqueries: totalQueries,
      totalDomains: base.totalDomains,
      totalActiveDomains: base.totalActiveDomains,
      totalDNSRecords: base.totalDNSRecords,
      LatestLogs: delta.latestLogs, // Always use fresh logs
      totalFailedDNS_Queries: totalFailed,
      totalSuccessDNS_Queries: totalSuccess,
      totalForwardedDNS_Queries: totalForwarded,
      Percentages: {
        totalFailurePercentage: totalQueries ? Number(((totalFailed / totalQueries) * 100).toFixed(2)) : 0,
        totalSuccessPercentage: totalQueries ? Number(((totalSuccess / totalQueries) * 100).toFixed(2)) : 0,
        totalGlobalRequestForwardedPercentage: totalQueries ? Number(((totalForwarded / totalQueries) * 100).toFixed(2)) : 0
      },
      TopGlobalServer: topForwarders,
      avgResponseTimeDuration: mergedAvg.toFixed(0),
      computedAt: base.computedAt,
      isRealtime: true // Flag to indicate this is real-time merged data
    };
  }



}