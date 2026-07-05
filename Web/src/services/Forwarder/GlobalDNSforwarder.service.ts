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

/** Pre-allocated pool of reusable dgram sockets to avoid create/destroy per query.
 *  Uses DNS transaction ID (TXID) from the response to dispatch to the correct
 *  pending query, avoiding listener collision when multiple queries share a socket. */
class DgramSocketPool {
  private readonly poolSize: number;
  private sockets: dgram.Socket[] = [];
  private inUse: boolean[] = [];
  private waitQueue: Array<(socket: dgram.Socket, index: number) => void> = [];
  /** Per-socket map of TXID → response resolver */
  private pending: Map<number, Map<number, (msg: Buffer) => void>> = new Map();

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
      this.pending.set(i, new Map());
      // One permanent listener per socket — dispatches by DNS TXID
      socket.on('message', (respMsg: Buffer) => {
        const txid = respMsg.readUInt16BE(0);
        const perSocket = this.pending.get(i);
        if (!perSocket) return;
        const resolver = perSocket.get(txid);
        if (resolver) {
          perSocket.delete(txid);
          resolver(respMsg);
        }
      });
    }
  }

  /** Register a resolver for a given socket + TXID */
  registerPending(socketIndex: number, txid: number, resolver: (msg: Buffer) => void): void {
    const perSocket = this.pending.get(socketIndex);
    if (perSocket) perSocket.set(txid, resolver);
  }

  /** Unregister (on timeout or error) */
  unregisterPending(socketIndex: number, txid: number): void {
    const perSocket = this.pending.get(socketIndex);
    if (perSocket) perSocket.delete(txid);
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
      try { socket.close(); } catch { /* empty */ }
    }
    this.sockets = [];
    this.inUse = [];
    this.pending.clear();
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

/** Circuit breaker state machine for a single upstream DNS server. */
enum BreakerState { CLOSED, OPEN, HALF_OPEN }

class CircuitBreaker {
  private state: BreakerState = BreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;

  constructor(
    public readonly ip: string,
    public readonly name: string,
    threshold = 5,
    windowMs = 30_000,
    cooldownMs = 30_000,
  ) {
    this.ip = ip;
    this.name = name;
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
  }

  /** Returns true if this server should be attempted. */
  allowRequest(): boolean {
    const now = Date.now();
    if (this.state === BreakerState.CLOSED) return true;

    if (this.state === BreakerState.OPEN) {
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = BreakerState.HALF_OPEN;
        return true; // probe request
      }
      return false;
    }

    // HALF_OPEN — allow exactly one probe
    this.state = BreakerState.OPEN; // will flip to CLOSED on success
    return true;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = BreakerState.OPEN;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = BreakerState.CLOSED;
  }

  getState(): BreakerState { return this.state; }
  getFailureCount(): number { return this.failureCount; }
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
  /** Per-upstream circuit breakers keyed by IP */
  private breakers: Map<string, CircuitBreaker>;

  constructor() {
    this.socketPool = new DgramSocketPool(this.POOL_SIZE);
    this.socketPool.initialize().catch((err) => {
      logger.error('Failed to initialize dgram socket pool:', err as any);
    });
    this.breakers = new Map(
      GlobalDNS.map(srv => [srv.ip, new CircuitBreaker(srv.ip, srv.name)])
    );
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
   * Uses DNS TXID dispatch to avoid listener collision on shared sockets.
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
    const txid = msg.readUInt16BE(0);

    try {
      const tryNext = async (idx: number): Promise<Buffer | null> => {
        if (idx >= availableDNS.length) {
          logger.error(`No response from any DNS server for ${queryName}`);
          return null;
        }

        const dnsIP = availableDNS[idx];
        const breaker = this.breakers.get(dnsIP.ip)!;

        // Circuit breaker: skip if OPEN (fast-fail in ~0ms vs waiting 2s)
        if (!breaker.allowRequest()) {
          return tryNext(idx + 1);
        }

        const response = await new Promise<Buffer | null>((resolve) => {
          const cleanup = () => {
            clearTimeout(timeout);
            this.socketPool.unregisterPending(index, txid);
          };
          const timeout = setTimeout(() => {
            cleanup();
            breaker.recordFailure();
            resolve(null);
          }, 2000);

          this.socketPool.registerPending(index, txid, (respMsg: Buffer) => {
            cleanup();
            resolve(respMsg);
          });

          try {
            socket.send(msg, 53, dnsIP.ip);
            if (process.env.DEBUG_DNS) {
              logger.info(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip})`);
            }
          } catch {
            cleanup();
            breaker.recordFailure();
            resolve(null);
          }
        });

        if (!response) return tryNext(idx + 1);
        breaker.recordSuccess();

        const duration = performance.now() - start;
        // Fire-and-forget analytics — never block the response path
        container.get<RabbitMQService>('RabbitMQService').publish(QueueKeys.DNS_Analytics, {
          queryName,
          queryType,
          timestamp: Date.now(),
          SourceIP: rinfo.address,
          Status: isFailSafe ? DNS_QUERY_STATUS_KEYS.FAIL_SAFE : DNS_QUERY_STATUS_KEYS.FORWARDED,
          From: isFailSafe ? DNS_QUERY_STATUS_KEYS.FROM_FAIL_SAFE : dnsIP.name,
          duration
        }, { persistent: false, priority: 5 }).catch(() => {});

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
    breakers: Array<{ ip: string; name: string; state: string; failures: number }>;
  } {
    const succeeded = this.totalForwardsSucceeded;
    const attempted = this.totalForwardsAttempted;
    const states = ['CLOSED', 'OPEN', 'HALF_OPEN'];
    return {
      activeForwards: this.activeForwardCount,
      queueDepth: this.forwardWaitQueue.length,
      concurrencyLimit: this.MAX_CONCURRENT_FORWARDS,
      totalAttempted: attempted,
      totalSucceeded: succeeded,
      successRate: attempted > 0 ? (succeeded / attempted) * 100 : 0,
      breakers: GlobalDNS.map(srv => {
        const b = this.breakers.get(srv.ip)!;
        return { ip: srv.ip, name: srv.name, state: states[b.getState()], failures: b.getFailureCount() };
      }),
    };
  }
}
