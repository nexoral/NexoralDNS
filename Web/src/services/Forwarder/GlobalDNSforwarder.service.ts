/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "node:dgram";

import { logger, CacheKeys, DNS_QUERY_STATUS_KEYS, QueueKeys, RabbitMQService } from 'nexoraldns-shared';
import container from "../../container/appContainer";
import { RedisCacheService } from "../../Redis/Redis.cache";
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

type PendingResolver = {
  resolver: ((msg: Buffer) => void) | null;
  expectedRemote?: string;
};

/**
 * Pool of shared dgram sockets for upstream forwarding. Each socket multiplexes
 * many in-flight queries at once, keyed by a generated 16-bit TXID, so a forward
 * never blocks waiting for a free socket. A generated TXID (not the client's) is
 * used on the wire so clients sharing a TXID can't clobber each other's pending
 * entry; the caller restores the original TXID on the response before replying.
 */
class MultiplexedSocketPool {
  private readonly size: number;
  private sockets: dgram.Socket[] = [];
  /** Per-socket generated-TXID -> resolver state. */
  private pending: Array<Map<number, PendingResolver>> = [];
  private nextTxid: number[] = [];
  private rr = 0;

  constructor(size: number) {
    this.size = Math.max(1, size);
  }

  initialize(): void {
    for (let i = 0; i < this.size; i++) {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('error', () => { /* per-query timeouts surface failures */ });
      socket.unref();
      const map = new Map<number, PendingResolver>();
      socket.on('message', (respMsg: Buffer, remoteInfo: dgram.RemoteInfo) => {
        if (respMsg.length < 2) return;
        const txid = respMsg.readUInt16BE(0);
        const entry = map.get(txid);
        if (entry?.resolver && entry.expectedRemote === remoteInfo.address) {
          map.delete(txid);
          entry.resolver(respMsg);
        }
      });
      this.sockets.push(socket);
      this.pending.push(map);
      this.nextTxid.push(0);
    }
  }

  pick(): number {
    const i = this.rr;
    this.rr = (this.rr + 1) % this.size;
    return i;
  }

  /** Reserve a free TXID on socket `i`, or -1 if all 65 536 are in flight. */
  reserve(i: number): number {
    const map = this.pending[i];
    if (map.size >= 0x10000) return -1;
    let txid = this.nextTxid[i];
    while (map.has(txid)) txid = (txid + 1) & 0xFFFF;
    map.set(txid, { resolver: null });
    this.nextTxid[i] = (txid + 1) & 0xFFFF;
    return txid;
  }

  reserveAny(): { index: number; txid: number } | null {
    for (let attempt = 0; attempt < this.size; attempt++) {
      const index = this.pick();
      const txid = this.reserve(index);
      if (txid >= 0) return { index, txid };
    }
    return null;
  }

  setResolver(i: number, txid: number, expectedRemote: string, resolver: (msg: Buffer) => void): void {
    if (this.pending[i].has(txid)) {
      this.pending[i].set(txid, { expectedRemote, resolver });
    }
  }

  /** Drop the resolver but keep the reservation across retry attempts. */
  clearResolver(i: number, txid: number): void {
    const entry = this.pending[i].get(txid);
    if (entry) this.pending[i].set(txid, { expectedRemote: entry.expectedRemote, resolver: null });
  }

  release(i: number, txid: number): void {
    this.pending[i].delete(txid);
  }

  socket(i: number): dgram.Socket {
    return this.sockets[i];
  }

  totalPending(): number {
    return this.pending.reduce((sum, m) => sum + m.size, 0);
  }

  close(): void {
    for (const socket of this.sockets) {
      try { socket.close(); } catch { /* empty */ }
    }
    this.sockets = [];
    this.pending = [];
    this.nextTxid = [];
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
  private failureWindowStart = 0;
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
    const now = Date.now();
    if (this.failureWindowStart === 0 || now - this.failureWindowStart > this.windowMs) {
      this.failureWindowStart = now;
      this.failureCount = 0;
    }
    this.failureCount++;
    this.lastFailureTime = now;
    if (this.failureCount >= this.threshold) {
      this.state = BreakerState.OPEN;
    }
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.failureWindowStart = 0;
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
  // Shared sockets; each multiplexes up to 65 536 queries via generated TXIDs, so
  // this spreads kernel send/recv-buffer load, not concurrency.
  private readonly SOCKET_POOL_SIZE = 64;
  private totalForwardsAttempted = 0;
  private totalForwardsSucceeded = 0;
  private socketPool: MultiplexedSocketPool;
  /** Per-upstream circuit breakers keyed by IP */
  private breakers: Map<string, CircuitBreaker>;

  constructor() {
    this.socketPool = new MultiplexedSocketPool(this.SOCKET_POOL_SIZE);
    this.socketPool.initialize();
    this.breakers = new Map(
      GlobalDNS.map(srv => [srv.ip, new CircuitBreaker(srv.ip, srv.name)])
    );
  }

  /**
   * Forwards one query on a shared, multiplexed socket, trying each upstream in
   * turn (circuit-breaker aware). A generated TXID dispatches the reply; the
   * client's original TXID is restored on the response before returning.
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
    const reservation = this.socketPool.reserveAny();
    if (!reservation) {
      logger.error(`Forward socket pool saturated for ${queryName}`);
      return null;
    }
    const { index, txid } = reservation;
    const socket = this.socketPool.socket(index);
    const originalTxid = msg.readUInt16BE(0);
    // Copy so the client's buffer is untouched, then stamp our generated TXID.
    const outMsg = Buffer.from(msg);
    outMsg.writeUInt16BE(txid, 0);
    const availableDNS = shuffleArray([...GlobalDNS]);

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
            this.socketPool.clearResolver(index, txid);
          };
          const timeout = setTimeout(() => {
            cleanup();
            breaker.recordFailure();
            resolve(null);
          }, 2000);

          this.socketPool.setResolver(index, txid, dnsIP.ip, (respMsg: Buffer) => {
            cleanup();
            resolve(respMsg);
          });

          try {
            socket.send(outMsg, 53, dnsIP.ip);
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

        // Restore the client's original TXID so the reply matches their query.
        response.writeUInt16BE(originalTxid, 0);

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
      this.socketPool.release(index, txid);
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

  /** No blocking queue in the multiplexed model — retained for API compatibility. */
  getQueueDepth(): number {
    return 0;
  }

  getActiveForwards(): number {
    return this.socketPool.totalPending();
  }

  getTotalForwardsAttempted(): number {
    return this.totalForwardsAttempted;
  }

  getTotalForwardsSucceeded(): number {
    return this.totalForwardsSucceeded;
  }

  /** Natural ceiling: 65 536 TXIDs per socket × pool size (no artificial cap). */
  getConcurrencyLimit(): number {
    return this.SOCKET_POOL_SIZE * 0x10000;
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
      activeForwards: this.socketPool.totalPending(),
      queueDepth: 0,
      concurrencyLimit: this.SOCKET_POOL_SIZE * 0x10000,
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
