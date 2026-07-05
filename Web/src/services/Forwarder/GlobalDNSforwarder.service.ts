/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "dgram";
import logger from "../../utilities/logger"

// RabbitMQ
import CacheKeys, { DNS_QUERY_STATUS_KEYS, QueueKeys } from "../../Redis/CacheKeys.cache";
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";
import { RabbitMQService } from "../../RabbitMQ/Rabbitmq.config";
import InputOutputHandler from "../../utilities/IO.utls";

// Worst case per query: servers.length x 2s timeout, so keep this list short.
const GlobalDNS: { ip: string; name: string, location: string }[] = [
  { ip: "1.1.1.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "1.0.0.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "8.8.8.8", name: "Google DNS", location: "Global (Anycast)" },
  { ip: "8.8.4.4", name: "Google DNS", location: "Global (Anycast)" },
  { ip: "9.9.9.10", name: "Quad9 DNS (Unfiltered)", location: "Global (Anycast)" },
  { ip: "149.112.112.10", name: "Quad9 DNS (Unfiltered)", location: "Global (Anycast)" },
];

const ioHandler = new InputOutputHandler(null as any);

/** Pre-allocated pool of reusable dgram sockets to avoid create/destroy per query. */
class DgramSocketPool {
  private readonly poolSize: number;
  private sockets: dgram.Socket[] = [];
  private inUse: boolean[] = [];
  private waitQueue: Array<(socket: dgram.Socket, index: number) => void> = [];

  constructor(poolSize: number) {
    this.poolSize = poolSize;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.poolSize; i++) {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('error', () => {});
      socket.unref();
      this.sockets.push(socket);
      this.inUse.push(false);
    }
  }

  async acquire(): Promise<{ socket: dgram.Socket; index: number }> {
    for (let i = 0; i < this.poolSize; i++) {
      if (!this.inUse[i]) {
        this.inUse[i] = true;
        return { socket: this.sockets[i], index: i };
      }
    }
    return new Promise((resolve) => {
      this.waitQueue.push((socket, index) => resolve({ socket, index }));
    });
  }

  release(index: number): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      next(this.sockets[index], index);
    } else {
      this.inUse[index] = false;
    }
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) {
      try { socket.close(); } catch { }
    }
    this.sockets = [];
    this.inUse = [];
  }
}

/** Rewrites the TTL of every answer/authority/additional record in a raw DNS response. */
function modifyResponseTTL(response: Buffer, newTTL: number): Buffer {
  const modifiedResponse = Buffer.from(response);
  let offset = 12; // DNS header is 12 bytes

  const qdcount = response.readUInt16BE(4);
  for (let i = 0; i < qdcount; i++) {
    while (offset < response.length && response[offset] !== 0) {
      if ((response[offset] & 0xC0) === 0xC0) { offset += 2; break; } // compressed name pointer
      offset += response[offset] + 1;
    }
    if (response[offset] === 0) offset++;
    offset += 4; // QTYPE + QCLASS
  }

  const ancount = response.readUInt16BE(6);
  const nscount = response.readUInt16BE(8);
  const arcount = response.readUInt16BE(10);

  for (let i = 0; i < ancount + nscount + arcount; i++) {
    if ((response[offset] & 0xC0) === 0xC0) {
      offset += 2;
    } else {
      while (offset < response.length && response[offset] !== 0) offset += response[offset] + 1;
      offset++;
    }
    offset += 4; // TYPE + CLASS
    if (offset + 4 <= response.length) modifiedResponse.writeUInt32BE(newTTL, offset);
    offset += 4;
    if (offset + 2 <= response.length) {
      const rdlength = response.readUInt16BE(offset);
      offset += 2 + rdlength;
    }
  }

  return modifiedResponse;
}

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * GlobalDNSforwarder service — singleton that manages upstream DNS forwarding
 * with a pre-allocated socket pool to eliminate create/destroy overhead per query.
 */
export class GlobalDNSforwarderService {
  private readonly MAX_CONCURRENT_FORWARDS = 256;
  private readonly POOL_SIZE = 256;
  private activeForwardCount = 0;
  private forwardWaitQueue: Array<() => void> = [];
  private totalForwardsAttempted = 0;
  private totalForwardsSucceeded = 0;
  private socketPool: DgramSocketPool;

  constructor() {
    this.socketPool = new DgramSocketPool(this.POOL_SIZE);
    this.socketPool.initialize().catch((err) => {
      logger.error('Failed to initialize dgram socket pool:', err as any);
    });
  }

  private async acquireForwardSlot(): Promise<void> {
    if (this.activeForwardCount < this.MAX_CONCURRENT_FORWARDS) {
      this.activeForwardCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.forwardWaitQueue.push(resolve));
  }

  private releaseForwardSlot(): void {
    const next = this.forwardWaitQueue.shift();
    if (next) {
      next();
    } else {
      this.activeForwardCount--;
    }
  }

  /**
   * Forwards one query using a pooled socket, trying each upstream server in turn.
   */
  private async resolveOnPooledSocket(
    msg: Buffer,
    queryName: string,
    queryType: string,
    customTTL: number | null,
    rinfo: dgram.RemoteInfo,
    start: number,
    isFailSafe: boolean
  ): Promise<Buffer | null> {
    await this.acquireForwardSlot();
    const { socket, index } = await this.socketPool.acquire();
    const availableDNS = shuffleArray([...GlobalDNS]);

    try {
      const tryNext = async (idx: number): Promise<Buffer | null> => {
        if (idx >= availableDNS.length) {
          logger.error(`No response from any DNS server for ${queryName}`);
          return null;
        }

        const dnsIP = availableDNS[idx];

        const response = await new Promise<Buffer | null>((resolve) => {
          const cleanup = () => {
            clearTimeout(timeout);
            socket.removeListener('message', onMessage);
          };
          const onMessage = (respMsg: Buffer, respRinfo: dgram.RemoteInfo) => {
            if (respRinfo.address !== dnsIP.ip) return;
            cleanup();
            resolve(respMsg);
          };
          const timeout = setTimeout(() => { cleanup(); resolve(null); }, 2000);

          socket.on('message', onMessage);

          try {
            socket.send(msg, 53, dnsIP.ip);
            if (process.env.DEBUG_DNS) {
              logger.info(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip})`);
            }
          } catch {
            cleanup();
            resolve(null);
          }
        });

        if (!response) return tryNext(idx + 1);

        const duration = performance.now() - start;
        await container.get<RabbitMQService>('RabbitMQService').publish(QueueKeys.DNS_Analytics, {
          queryName,
          queryType,
          timestamp: Date.now(),
          SourceIP: rinfo.address,
          Status: isFailSafe ? DNS_QUERY_STATUS_KEYS.FAIL_SAFE : DNS_QUERY_STATUS_KEYS.FORWARDED,
          From: isFailSafe ? DNS_QUERY_STATUS_KEYS.FROM_FAIL_SAFE : dnsIP.name,
          duration
        }, { persistent: false, priority: 5 });

        const parsedRecord = ioHandler.parseDNSResponse(response, queryType);
        if (parsedRecord) {
          container.get<RedisCacheService>('RedisCacheService').set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, parsedRecord, customTTL ?? parsedRecord.ttl);
        }

        this.totalForwardsSucceeded++;
        return customTTL !== null ? modifyResponseTTL(response, customTTL) : response;
      };

      return await tryNext(0);
    } finally {
      this.socketPool.release(index);
      this.releaseForwardSlot();
    }
  }

  async forward(
    msg: Buffer,
    queryName: string,
    queryType: string,
    customTTL: number | null = null,
    rinfo: dgram.RemoteInfo,
    start: number,
    isFailSafe = false
  ): Promise<Buffer | null> {
    this.totalForwardsAttempted++;
    return this.resolveOnPooledSocket(msg, queryName, queryType, customTTL, rinfo, start, isFailSafe);
  }

  getQueueDepth(): number {
    return this.forwardWaitQueue.length;
  }

  getActiveForwards(): number {
    return this.activeForwardCount;
  }

  getTotalForwardsAttempted(): number {
    return this.totalForwardsAttempted;
  }

  getTotalForwardsSucceeded(): number {
    return this.totalForwardsSucceeded;
  }

  getConcurrencyLimit(): number {
    return this.MAX_CONCURRENT_FORWARDS;
  }

  getStatus(): {
    activeForwards: number;
    queueDepth: number;
    concurrencyLimit: number;
    totalAttempted: number;
    totalSucceeded: number;
    successRate: number;
  } {
    const succeeded = this.totalForwardsSucceeded;
    const attempted = this.totalForwardsAttempted;
    return {
      activeForwards: this.activeForwardCount,
      queueDepth: this.forwardWaitQueue.length,
      concurrencyLimit: this.MAX_CONCURRENT_FORWARDS,
      totalAttempted: attempted,
      totalSucceeded: succeeded,
      successRate: attempted > 0 ? (succeeded / attempted) * 100 : 0,
    };
  }
}
