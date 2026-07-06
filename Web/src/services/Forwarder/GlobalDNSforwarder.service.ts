/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "dgram";
import { Console } from "outers"

// RabbitMQ
import CacheKeys, { DNS_QUERY_STATUS_KEYS, QueueKeys } from "../../Redis/CacheKeys.cache";
import RabbitMQService from "../../RabbitMQ/Rabbitmq.config";
import RedisCache from "../../Redis/Redis.cache";
import InputOutputHandler from "../../utilities/IO.utls";

// Worst case per query: servers.length x 2s timeout, so keep this list short.
const GlobalDNS: { ip: string; name: string, location: string }[] = [
  { ip: "1.1.1.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "1.0.0.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "8.8.8.8", name: "Google DNS", location: "Global (Anycast)" },
  { ip: "8.8.4.4", name: "Google DNS", location: "Global (Anycast)" },
  // Unfiltered variant (9.9.9.10, not 9.9.9.9) — the default blocks malware
  // domains itself, which would double up with NexoralDNS's own ACL layer.
  { ip: "9.9.9.10", name: "Quad9 DNS (Unfiltered)", location: "Global (Anycast)" },
  { ip: "149.112.112.10", name: "Quad9 DNS (Unfiltered)", location: "Global (Anycast)" },
];

const ioHandler = new InputOutputHandler(null as any);

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

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) { }

  /** Returns true if this upstream should be attempted. */
  allowRequest(): boolean {
    if (this.state === BreakerState.CLOSED) return true;

    if (this.state === BreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.cooldownMs) {
        this.state = BreakerState.HALF_OPEN; // allow a single probe
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow exactly one probe; flips to CLOSED on success below.
    this.state = BreakerState.OPEN;
    return true;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) this.state = BreakerState.OPEN;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = BreakerState.CLOSED;
  }
}

// Per-upstream circuit breakers keyed by IP — fast-fail a dead server in ~0ms
// instead of paying the full 2s timeout on every query while it's down.
const breakers: Map<string, CircuitBreaker> = new Map(
  GlobalDNS.map(srv => [srv.ip, new CircuitBreaker()])
);

// Bounds concurrent forwarder sockets so a large burst can't exhaust the
// process's file descriptor limit. Requests beyond the cap queue for a slot.
const MAX_CONCURRENT_FORWARDS = 256;
let activeForwardCount = 0;
const forwardWaitQueue: Array<() => void> = [];

function acquireForwardSlot(): Promise<void> {
  if (activeForwardCount < MAX_CONCURRENT_FORWARDS) {
    activeForwardCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => forwardWaitQueue.push(resolve));
}

function releaseForwardSlot(): void {
  const next = forwardWaitQueue.shift();
  if (next) next();
  else activeForwardCount--;
}

/** Forwards one query on its own short-lived socket, trying each upstream server in turn. */
async function resolveOnDedicatedSocket(
  msg: Buffer,
  queryName: string,
  queryType: string,
  customTTL: number | null,
  rinfo: dgram.RemoteInfo,
  start: number,
  isFailSafe: boolean
): Promise<Buffer | null> {
  await acquireForwardSlot();
  const availableDNS = shuffleArray([...GlobalDNS]);
  const socket = dgram.createSocket({ type: 'udp4' });
  socket.on('error', () => { /* surfaced via the per-attempt timeout below */ });

  try {
    const tryNext = async (index: number): Promise<Buffer | null> => {
      if (index >= availableDNS.length) {
        Console.red(`No response from any DNS server for ${queryName}`);
        return null;
      }

      const dnsIP = availableDNS[index];
      const breaker = breakers.get(dnsIP.ip)!;

      // Skip an upstream whose breaker is OPEN — fast-fail to the next server.
      if (!breaker.allowRequest()) {
        return tryNext(index + 1);
      }

      const response = await new Promise<Buffer | null>((resolve) => {
        const cleanup = () => {
          clearTimeout(timeout);
          socket.removeListener('message', onMessage);
        };
        // Filter by sender address: this socket is reused across sequential
        // attempts to different servers, so a late reply from a prior attempt
        // must not be mistaken for the current one's answer.
        const onMessage = (respMsg: Buffer, respRinfo: dgram.RemoteInfo) => {
          if (respRinfo.address !== dnsIP.ip) return;
          cleanup();
          resolve(respMsg);
        };
        const timeout = setTimeout(() => {
          cleanup();
          breaker.recordFailure();
          resolve(null);
        }, 2000);

        socket.on('message', onMessage);

        try {
          socket.send(msg, 53, dnsIP.ip);
          if (process.env.DEBUG_DNS) {
            Console.bright(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip})`);
          }
        } catch {
          cleanup();
          breaker.recordFailure();
          resolve(null);
        }
      });

      if (!response) return tryNext(index + 1);
      breaker.recordSuccess();

      const duration = performance.now() - start;
      RabbitMQService.publish(QueueKeys.DNS_Analytics, {
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
        RedisCache.set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, parsedRecord, customTTL ?? parsedRecord.ttl);
      }

      return customTTL !== null ? modifyResponseTTL(response, customTTL) : response;
    };

    return await tryNext(0);
  } finally {
    socket.close();
    releaseForwardSlot();
  }
}

export default function GlobalDNSforwarder(
  msg: Buffer,
  queryName: string,
  queryType: string,
  customTTL: number | null = null,
  rinfo: dgram.RemoteInfo,
  start: number,
  isFailSafe = false
): Promise<Buffer | null> {
  return resolveOnDedicatedSocket(msg, queryName, queryType, customTTL, rinfo, start, isFailSafe);
}
