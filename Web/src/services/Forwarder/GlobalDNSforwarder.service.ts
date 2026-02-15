/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "dgram";
import { Console } from "outers"

// RabbitMQ
import CacheKeys, { DNS_QUERY_STATUS_KEYS, QueueKeys } from "../../Redis/CacheKeys.cache";
import RabbitMQService from "../../RabbitMQ/Rabbitmq.config";
import RedisCache from "../../Redis/Redis.cache";
import InputOutputHandler from "../../utilities/IO.utls";

const GlobalDNS: { ip: string; name: string, location: string }[] = [
  // Cloudflare DNS (privacy-focused, but no filtering)
  { ip: "1.1.1.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "1.0.0.1", name: "Cloudflare DNS", location: "Global (Anycast)" },

  // Google Public DNS (completely unrestricted)
  { ip: "8.8.8.8", name: "Google DNS", location: "Global (Anycast)" },
  { ip: "8.8.4.4", name: "Google DNS", location: "Global (Anycast)" },

  // Verisign Public DNS (no filtering, stable, privacy-respecting)
  { ip: "64.6.64.6", name: "Verisign DNS", location: "USA (Global Anycast)" },
  { ip: "64.6.65.6", name: "Verisign DNS", location: "USA (Global Anycast)" },

  // OpenDNS (Cisco) - use the *standard* ones, not FamilyShield
  { ip: "208.67.222.222", name: "OpenDNS (Standard)", location: "Global (Anycast, Cisco)" },
  { ip: "208.67.220.220", name: "OpenDNS (Standard)", location: "Global (Anycast, Cisco)" },

  // Level 3 / CenturyLink (classic ISP-level resolvers, unrestricted)
  { ip: "4.2.2.1", name: "Level3 DNS", location: "USA (Anycast)" },
  { ip: "4.2.2.2", name: "Level3 DNS", location: "USA (Anycast)" },
  { ip: "4.2.2.3", name: "Level3 DNS", location: "USA (Anycast)" },
  { ip: "4.2.2.4", name: "Level3 DNS", location: "USA (Anycast)" },

  // Neustar / UltraDNS (public resolver, standard version = no filtering)
  { ip: "156.154.70.1", name: "Neustar UltraDNS (Standard)", location: "USA (Anycast)" },
  { ip: "156.154.71.1", name: "Neustar UltraDNS (Standard)", location: "USA (Anycast)" },
];

// Shared IO Handler
const ioHandler = new InputOutputHandler(null as any);

/**
 * Modifies TTL values in a DNS response buffer.
 */
function modifyResponseTTL(response: Buffer, newTTL: number): Buffer {
  // Create a copy to avoid modifying the original
  const modifiedResponse = Buffer.from(response);

  // DNS header is 12 bytes, then comes the question section
  let offset = 12;

  // Skip question section
  const qdcount = response.readUInt16BE(4); // Number of questions
  for (let i = 0; i < qdcount; i++) {
    // Skip domain name
    while (offset < response.length && response[offset] !== 0) {
      if ((response[offset] & 0xC0) === 0xC0) {
        // Compressed name (pointer)
        offset += 2;
        break;
      } else {
        // Regular label
        offset += response[offset] + 1;
      }
    }
    if (response[offset] === 0) offset++; // Skip null terminator
    offset += 4; // Skip QTYPE (2 bytes) and QCLASS (2 bytes)
  }

  // Process answer, authority, and additional sections
  const ancount = response.readUInt16BE(6); // Number of answers
  const nscount = response.readUInt16BE(8); // Number of authority records
  const arcount = response.readUInt16BE(10); // Number of additional records

  const totalRecords = ancount + nscount + arcount;

  for (let i = 0; i < totalRecords; i++) {
    // Skip name field
    if ((response[offset] & 0xC0) === 0xC0) {
      // Compressed name (pointer)
      offset += 2;
    } else {
      // Regular name
      while (offset < response.length && response[offset] !== 0) {
        offset += response[offset] + 1;
      }
      offset++; // Skip null terminator
    }

    // Skip TYPE (2 bytes) and CLASS (2 bytes)
    offset += 4;

    // Modify TTL (4 bytes)
    if (offset + 4 <= response.length) {
      modifiedResponse.writeUInt32BE(newTTL, offset);
    }
    offset += 4;

    // Skip RDLENGTH and RDATA
    if (offset + 2 <= response.length) {
      const rdlength = response.readUInt16BE(offset);
      offset += 2 + rdlength;
    }
  }

  return modifiedResponse;
}

// Fisher-Yates shuffle to randomize DNS servers
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Singleton service to handle DNS forwarding using a single shared socket.
 * Handles request tracking, ID rewriting, and response matching.
 */
class DNSForwarderService {
  private static instance: DNSForwarderService;
  private socket: dgram.Socket;
  private pendingRequests: Map<number, {
    resolve: (response: Buffer | null) => void;
    originalId: number;
    timeout: NodeJS.Timeout;
    dnsIP: typeof GlobalDNS[0];
  }> = new Map();
  private currentId: number = 1;

  private constructor() {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.init();
  }

  public static getInstance(): DNSForwarderService {
    if (!DNSForwarderService.instance) {
      DNSForwarderService.instance = new DNSForwarderService();
    }
    return DNSForwarderService.instance;
  }

  private init() {
    this.socket.on('message', (msg) => {
      if (msg.length < 2) return;
      const id = msg.readUInt16BE(0);

      const pending = this.pendingRequests.get(id);
      if (pending) {
        // Clear timeout and remove from map
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);

        // Restore original Transaction ID
        const responseWithOriginalId = Buffer.from(msg);
        responseWithOriginalId.writeUInt16BE(pending.originalId, 0);

        pending.resolve(responseWithOriginalId);
      }
    });

    this.socket.on('error', (err) => {
      Console.red(`[Forwarder] Socket error: ${err.message}`);
      // Usually minimal handling needed for UDP socket error, maybe re-bind if closed
    });

    // Optional: High buffer size for performance
    try {
      this.socket.setRecvBufferSize(4 * 1024 * 1024); // 4MB
      this.socket.setSendBufferSize(4 * 1024 * 1024);
    } catch (e) {
      // Ignore if OS doesn't allow
    }
  }

  private getNextId(): number {
    // Generate a unique 16-bit ID that isn't currently in use
    let attempts = 0;
    while (attempts < 65536) {
      this.currentId = (this.currentId + 1) % 65536;
      if (this.currentId === 0) continue; // Skip 0
      if (!this.pendingRequests.has(this.currentId)) {
        return this.currentId;
      }
      attempts++;
    }
    throw new Error("DNS Forwarder: pending request pool exhausted");
  }

  public async resolve(
    msg: Buffer,
    queryName: string,
    queryType: string,
    customTTL: number | null,
    rinfo: dgram.RemoteInfo,
    start: number
  ): Promise<Buffer | null> {
    const originalId = msg.readUInt16BE(0);
    const availableDNS = shuffleArray([...GlobalDNS]);

    const tryNext = async (index: number): Promise<Buffer | null> => {
      if (index >= availableDNS.length) {
        Console.red(`No response from any DNS server for ${queryName}`);
        return null;
      }

      const dnsIP = availableDNS[index];
      const newId = this.getNextId();

      // Create a promise for this attempt
      const attemptPromise = new Promise<Buffer | null>((resolve) => {
        const timeout = setTimeout(() => {
          // Timeout occurred
          this.pendingRequests.delete(newId);
          resolve(null); // Resolve null to trigger retry
        }, 2000); // 2 second timeout per server

        this.pendingRequests.set(newId, {
          resolve,
          originalId,
          timeout,
          dnsIP
        });
      });

      // Prepare message with new ID
      const msgToSend = Buffer.from(msg);
      msgToSend.writeUInt16BE(newId, 0);

      // Send
      try {
        this.socket.send(msgToSend, 53, dnsIP.ip);
        if (process.env.DEBUG_DNS) {
          Console.bright(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip})`);
        }
      } catch (err) {
        this.pendingRequests.delete(newId);
        return tryNext(index + 1);
      }

      // Wait for response
      const response = await attemptPromise;

      if (response) {
        // Success!
        // Analytics
        const end = performance.now();
        const duration = end - start;

        // Batch/Simplified Analytics could be done here, but sticking to logic structure
        const AnalyticsMSgPayload = {
          queryName,
          queryType,
          timestamp: Date.now(),
          SourceIP: rinfo.address,
          Status: DNS_QUERY_STATUS_KEYS.FORWARDED,
          From: dnsIP.name,
          duration
        };

        // Fire and forget analytics (non-await)
        RabbitMQService.publish(QueueKeys.DNS_Analytics, AnalyticsMSgPayload, { persistent: false, priority: 5 });

        // Cache
        const parsedRecord = ioHandler.parseDNSResponse(response, queryType);
        if (parsedRecord) {
          RedisCache.set(`${CacheKeys.Domain_DNS_Record}:${queryName}`, parsedRecord, customTTL ?? parsedRecord.ttl);
        }

        if (customTTL !== null) {
          return modifyResponseTTL(response, customTTL);
        }
        return response;
      } else {
        // Failure/Timeout, try next
        return tryNext(index + 1);
      }
    };

    return tryNext(0);
  }
}

// Export the wrapper function to maintain API compatibility
export default function GlobalDNSforwarder(
  msg: Buffer,
  queryName: string,
  queryType: string,
  customTTL: number | null = null,
  rinfo: dgram.RemoteInfo,
  start: number
): Promise<Buffer | null> {
  return DNSForwarderService.getInstance().resolve(msg, queryName, queryType, customTTL, rinfo, start);
}