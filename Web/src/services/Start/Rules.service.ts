/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Console } from "outers";
import { IDNSIOHandler } from "../../utilities/IDNSIOHandler";
import dgram from "dgram";
import { DomainDBPoolService } from "../DB/DB_Pool.service";
import { GlobalDNSforwarderService } from "../Forwarder/GlobalDNSforwarder.service";

// Rules Services
import ServiceStatusChecker, { ServiceStatusResult } from "./ServiceStatusChecker.service";
import CacheKeys, { QueueKeys } from "../../Redis/CacheKeys.cache";

// RabbitMQ
import { DNS_QUERY_STATUS_KEYS } from "../../Redis/CacheKeys.cache";
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";
import { RabbitMQService } from "../../RabbitMQ/Rabbitmq.config";
import BlockList from "../Rules/BlockList.service";

export default class StartRulesService {
  private inflight: Map<string, Promise<any>> = new Map(); // Single-flight DB request tracking

  // Ensures the Redis cache:invalidate subscription is registered only once per process
  // across the 3 singleton instances (UDP, TCP, DoT)
  static #subscribed = false;

  // Service Instances
  private blockList: BlockList;
  private serviceStatusChecker: ServiceStatusChecker;
  private dbPoolService: DomainDBPoolService;

  constructor() {
    // Get services from DI container
    this.blockList = container.get<BlockList>('BlockList');
    this.serviceStatusChecker = container.get<ServiceStatusChecker>('ServiceStatusChecker');
    this.dbPoolService = container.get<DomainDBPoolService>('DomainDBPoolService');

    // Subscribe to Cache Invalidation Channel — guarded so only one subscription
    // is registered per process regardless of how many service instances are created
    if (!StartRulesService.#subscribed) {
      StartRulesService.#subscribed = true;
      container.get<RedisCacheService>('RedisCacheService').subscribe('cache:invalidate', async (message) => {
      // Log only on invalidation event (rare)
      Console.yellow(`🔔 Received Cache Invalidation Request: ${message}`);

      // Clear BlockList Caches
      BlockList.clearAllCaches();

      // Clear Service Status Cache
      await container.get<RedisCacheService>('RedisCacheService').delete(CacheKeys.Service_Status);

      // Clear blocked domains local cache if specific IP mentioned (optional optimization)
      if (message.includes('ip:')) {
        // Logic to clear specific IP cache if implemented
      }

      Console.green('✅ Local Caches Cleared');
      }).catch((error) => {
        // Allow a retry on the next instance construction instead of staying dead
        StartRulesService.#subscribed = false;
        Console.red('❌ Failed to subscribe to cache:invalidate channel:', error);
      });
    }
  }

  public async execute(msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo, io: IDNSIOHandler): Promise<void | boolean> {
    // Start Performance Timer
    const start = performance.now();

    if (!msg || !rinfo) {
      return;
    }

    // Parse query name
    const queryName: string = io.parseQueryName(msg);
    const queryType: string = io.parseQueryType(msg);

    Console.blue(`🔍 DNS Query: ${queryName} (${queryType}) from ${rinfo.address}`);

    // Analytics Payload
    const AnalyticsMSgPayload: {
      queryName: string,
      queryType: string,
      timestamp: number,
      SourceIP: string,
      Status: string,
      From: string,
      duration: number
    } = {
      queryName: queryName,
      queryType: queryType,
      SourceIP: rinfo.address,
      timestamp: Date.now(),
      Status: "",
      From: "",
      duration: 0
    }


    // Add Rule Checker with Fail-Safe
    let serviceStatus: ServiceStatusResult;
    let databaseOffline = false;

    try {
      serviceStatus = await this.serviceStatusChecker.checkServiceStatus(queryName, io, msg, rinfo);
      if (!serviceStatus.serviceStatus) {
        if (!serviceStatus.serviceConfig) {
          // MongoDB offline/uninitialized returns false with config = null
          throw new Error("Service config missing — database offline");
        }
        // Service is explicitly set to inactive
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN;
        AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN_FROM;
        AnalyticsMSgPayload.duration = performance.now() - start;
        await this.publishAnalytics(AnalyticsMSgPayload);
        return;
      }
    } catch (error) {
      Console.yellow(`⚠️ Fail-Safe Active: Database offline for query ${queryName}. Bypassing access controls.`);
      databaseOffline = true;
      serviceStatus = {
        serviceStatus: true,
        serviceConfig: { DefaultTTL: 0 }
      };
    }

    // Check Service Status Document is perfect or not
    if (!serviceStatus.serviceConfig || serviceStatus.serviceConfig == null) {
      serviceStatus.serviceConfig = {
        DefaultTTL: 0
      };
    }

    // Check Access Control Policy Check with Fail-Safe
    let PolicyCheckRuleStatus = false;
    if (!databaseOffline) {
      try {
        PolicyCheckRuleStatus = await this.blockList.checkDomain(queryName, rinfo.address);
      } catch (err) {
        databaseOffline = true;
        Console.yellow(`⚠️ Fail-Safe Active: Block list check failed due to DB error. Bypassing.`);
      }
    }

    if (PolicyCheckRuleStatus) {
      // Add to Analytics
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.BLOCKED;
      AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_BLOCKED;
      AnalyticsMSgPayload.duration = performance.now() - start;

      await this.publishAnalytics(AnalyticsMSgPayload);
      io.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", serviceStatus.serviceConfig.DefaultTTL); // Respond with NXDOMAIN
      return;
    }

    // Taking Record From Cache / DB with Fail-Safe
    let record;
    if (!databaseOffline) {
      try {
        const RecordFromCache = await container.get<RedisCacheService>('RedisCacheService').get(`${CacheKeys.Domain_DNS_Record}:${queryName}`);
        if (RecordFromCache !== null) {
          record = RecordFromCache;
          AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_CACHE;
        } else {
          // Single-flight DB request: if multiple requests for same domain arrive, they share one DB call
          let NewRecordFromDB = null;

          if (this.inflight.has(queryName)) {
            // Join existing DB call
            NewRecordFromDB = await this.inflight.get(queryName);
          } else {
            // Create new DB call promise
            const promise = (async () => {
              try {
                return await this.dbPoolService.getDnsRecordByDomainName(queryName);
              } catch (error) {
                databaseOffline = true;
                Console.yellow(`⚠️ Fail-Safe Active: DB query error for record ${queryName}. Bypassing.`);
                return null;
              } finally {
                this.inflight.delete(queryName);
              }
            })();

            this.inflight.set(queryName, promise);
            NewRecordFromDB = await promise;
          }

          if (NewRecordFromDB) {
            // If Cache Fail then take from MongoDB
            record = NewRecordFromDB;
            AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_DB;

            // Add the new Document to the Cache with Domain's Default TTL
            container.get<RedisCacheService>('RedisCacheService').set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, NewRecordFromDB, record.ttl);
          }
        }
      } catch (err) {
        databaseOffline = true;
        Console.yellow(`⚠️ Fail-Safe Active: Cache/DB record lookup failed. Bypassing.`);
      }
    }

    if (!databaseOffline && queryName === record?.name) {
      // Add to Analytics
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.RESOLVED;
      AnalyticsMSgPayload.duration = performance.now() - start;

      await this.publishAnalytics(AnalyticsMSgPayload);

      // Use buildSendAnswer method from utilities
      const response = io.buildSendAnswer(msg, rinfo, record.name, record.value, record.ttl);

      if (!response) {
        // Add to Analytics
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
        AnalyticsMSgPayload.duration = performance.now() - start;

        await this.publishAnalytics(AnalyticsMSgPayload);
        Console.red(`Failed to respond to ${queryName}`);
      }
    } else {
      // Forward to Global DNS for non-matching domains (or when database is offline)
      if (!databaseOffline) {
        AnalyticsMSgPayload.From = "Upstream"; // Will be updated by forwarder logic
      }

      try {
        const forwarder = container.get<GlobalDNSforwarderService>('GlobalDNSforwarder');
        const forwardedResponse = await forwarder.forward(
          msg,
          queryName,
          queryType,
          serviceStatus.serviceConfig.DefaultTTL,
          rinfo,
          start,
          databaseOffline
        );
        if (forwardedResponse) {
          const resp: boolean = io.sendRawAnswer(forwardedResponse, rinfo);
          if (!resp) {
            // Add to Analytics
            if (!databaseOffline) {
              AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
              AnalyticsMSgPayload.duration = performance.now() - start;
              await this.publishAnalytics(AnalyticsMSgPayload);
            }
            Console.red(`Failed to forward ${queryName} to Global DNS`);
          }
          // Note: GlobalDNSforwarder pushes its own analytics for the forwarding event
        }
        else {
          // Add to Analytics
          if (!databaseOffline) {
            AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
            AnalyticsMSgPayload.duration = performance.now() - start;
            await this.publishAnalytics(AnalyticsMSgPayload);
          }

          Console.red(`No response received from Global DNS for ${queryName}`);
      io.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 0); // TTL=0 prevents client-side caching for instant policy toggle
        }
      } catch (error) {
        // Add to Analytics
        if (!databaseOffline) {
          AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
          AnalyticsMSgPayload.duration = performance.now() - start;
          await this.publishAnalytics(AnalyticsMSgPayload);
        }
        Console.red(`Failed to forward ${queryName} to Global DNS:`, error);
      }
    }
  }

  // Helper to publish analytics with optimized settings
  private async publishAnalytics(payload: any) {
    await container.get<RabbitMQService>('RabbitMQService').publish(QueueKeys.DNS_Analytics, payload, { persistent: false, priority: 5 });
  }
}