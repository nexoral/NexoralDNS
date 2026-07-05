/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../../utilities/logger";
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
      logger.warn(`🔔 Received Cache Invalidation Request: ${message}`);

      // Clear BlockList Caches
      BlockList.clearAllCaches();

      // Clear Service Status Cache
      await container.get<RedisCacheService>('RedisCacheService').delete(CacheKeys.Service_Status);

      // Clear blocked domains local cache if specific IP mentioned (optional optimization)
      if (message.includes('ip:')) {
        // Logic to clear specific IP cache if implemented
      }

      logger.info('✅ Local Caches Cleared');
      }).catch((error) => {
        // Allow a retry on the next instance construction instead of staying dead
        StartRulesService.#subscribed = false;
        logger.error('❌ Failed to subscribe to cache:invalidate channel:', error as any);
      });
    }
  }

  public async execute(msg: Buffer<ArrayBufferLike>, rinfo: dgram.RemoteInfo, io: IDNSIOHandler): Promise<void | boolean> {
    const start = performance.now();

    if (!msg || !rinfo) return;

    const QUERY_TIMEOUT_MS = 5000;
    const timeoutSignal = { aborted: false };
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timeoutSignal.aborted = true;
        reject(new Error(`Query processing timed out after ${QUERY_TIMEOUT_MS}ms`));
      }, QUERY_TIMEOUT_MS);
    });

    try {
      await Promise.race([
        this.executeCore(msg, rinfo, io, start, timeoutSignal),
        timeoutPromise,
      ]);
    } catch (error) {
      if (timeoutSignal.aborted) {
        logger.error(`Query timeout for ${io.parseQueryName(msg)} from ${rinfo.address}`);
        try { io.buildSendAnswer(msg, rinfo, '', '0.0.0.0', 0); } catch { /* best-effort SERVFAIL */ }
      } else {
        logger.error(`Query error:`, error as any);
      }
    }
  }

  private async executeCore(
    msg: Buffer<ArrayBufferLike>,
    rinfo: dgram.RemoteInfo,
    io: IDNSIOHandler,
    start: number,
    timeoutSignal: { aborted: boolean }
  ): Promise<void> {
    const queryName: string = io.parseQueryName(msg);
    const queryType: string = io.parseQueryType(msg);

    logger.info(`DNS Query: ${queryName} (${queryType}) from ${rinfo.address}`);

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

    let serviceStatus: ServiceStatusResult;
    let databaseOffline = false;

    try {
      serviceStatus = await this.serviceStatusChecker.checkServiceStatus(queryName, io, msg, rinfo);
      if (!serviceStatus.serviceStatus) {
        if (!serviceStatus.serviceConfig) {
          throw new Error("Service config missing — database offline");
        }
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN;
        AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.SERVICE_DOWN_FROM;
        AnalyticsMSgPayload.duration = performance.now() - start;
        this.publishAnalytics(AnalyticsMSgPayload);
        return;
      }
    } catch (error) {
      logger.warn(`Fail-Safe Active: Database offline for query ${queryName}. Bypassing access controls.`);
      databaseOffline = true;
      serviceStatus = {
        serviceStatus: true,
        serviceConfig: { DefaultTTL: 0 }
      };
    }

    if (!serviceStatus.serviceConfig || serviceStatus.serviceConfig == null) {
      serviceStatus.serviceConfig = { DefaultTTL: 0 };
    }

    let PolicyCheckRuleStatus = false;
    if (!databaseOffline) {
      try {
        PolicyCheckRuleStatus = await this.blockList.checkDomain(queryName, rinfo.address);
      } catch (err) {
        databaseOffline = true;
        logger.warn(`Fail-Safe Active: Block list check failed due to DB error. Bypassing.`);
      }
    }

    if (PolicyCheckRuleStatus) {
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.BLOCKED;
      AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_BLOCKED;
      AnalyticsMSgPayload.duration = performance.now() - start;

      io.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", serviceStatus.serviceConfig.DefaultTTL);
      this.publishAnalytics(AnalyticsMSgPayload);
      return;
    }

    let record;
    if (!databaseOffline) {
      try {
        const RecordFromCache = await container.get<RedisCacheService>('RedisCacheService').get(`${CacheKeys.Domain_DNS_Record}:${queryName}`);
        if (RecordFromCache !== null) {
          record = RecordFromCache;
          AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_CACHE;
        } else {
          let NewRecordFromDB = null;

          if (this.inflight.has(queryName)) {
            NewRecordFromDB = await this.inflight.get(queryName);
          } else {
            const promise = (async () => {
              try {
                return await this.dbPoolService.getDnsRecordByDomainName(queryName);
              } catch (error) {
                databaseOffline = true;
                logger.warn(`Fail-Safe Active: DB query error for record ${queryName}. Bypassing.`);
                return null;
              } finally {
                this.inflight.delete(queryName);
              }
            })();

            this.inflight.set(queryName, promise);
            NewRecordFromDB = await promise;
          }

          if (NewRecordFromDB) {
            record = NewRecordFromDB;
            AnalyticsMSgPayload.From = DNS_QUERY_STATUS_KEYS.FROM_DB;

            container.get<RedisCacheService>('RedisCacheService').set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, NewRecordFromDB, record.ttl);
          }
        }
      } catch (err) {
        databaseOffline = true;
        logger.warn(`Fail-Safe Active: Cache/DB record lookup failed. Bypassing.`);
      }
    }

    if (!databaseOffline && queryName === record?.name) {
      AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.RESOLVED;
      AnalyticsMSgPayload.duration = performance.now() - start;

      const response = io.buildSendAnswer(msg, rinfo, record.name, record.value, record.ttl);
      this.publishAnalytics(AnalyticsMSgPayload);

      if (!response) {
        AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
        AnalyticsMSgPayload.duration = performance.now() - start;
        this.publishAnalytics(AnalyticsMSgPayload);
        logger.error(`Failed to respond to ${queryName}`);
      }
    } else {
      if (!databaseOffline) {
        AnalyticsMSgPayload.From = "Upstream";
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
            if (!databaseOffline) {
              AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
              AnalyticsMSgPayload.duration = performance.now() - start;
              this.publishAnalytics(AnalyticsMSgPayload);
            }
            logger.error(`Failed to forward ${queryName} to Global DNS`);
          }
        }
        else {
          if (!databaseOffline) {
            AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
            AnalyticsMSgPayload.duration = performance.now() - start;
            this.publishAnalytics(AnalyticsMSgPayload);
          }

          logger.error(`No response received from Global DNS for ${queryName}`);
          io.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 0);
        }
      } catch (error) {
        if (!databaseOffline) {
          AnalyticsMSgPayload.Status = DNS_QUERY_STATUS_KEYS.FAILED;
          AnalyticsMSgPayload.duration = performance.now() - start;
          this.publishAnalytics(AnalyticsMSgPayload);
        }
        logger.error(`Failed to forward ${queryName} to Global DNS:`, error as any);
      }
    }
  }

  // Helper to publish analytics — fire-and-forget. Analytics is a best-effort,
  // non-critical concern and must NEVER block or delay the DNS answer, even when
  // the broker is down (a pending/failed publish stays off the response path).
  private publishAnalytics(payload: any): void {
    container.get<RabbitMQService>('RabbitMQService')
      .publish(QueueKeys.DNS_Analytics, payload, { persistent: false, priority: 5 })
      .catch(() => { /* swallow — never surface broker errors to DNS resolution */ });
  }
}