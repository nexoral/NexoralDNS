/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "dgram";
import { Console } from "outers"
import InputOutputHandler from "../../utilities/IO.utls";

const GlobalDNS: { ip: string; name: string, location: string, tier: number }[] = [
  // ========== TIER 1: BEST - Fastest, Most Reliable, Largest Infrastructure ==========

  // Cloudflare DNS (consistently fastest globally, massive anycast network)
  { ip: "1.1.1.1", name: "Cloudflare DNS", location: "Global (Anycast)", tier: 1 },
  { ip: "1.0.0.1", name: "Cloudflare DNS", location: "Global (Anycast)", tier: 1 },

  // Google Public DNS (huge infrastructure, extremely reliable)
  { ip: "8.8.8.8", name: "Google DNS", location: "Global (Anycast)", tier: 1 },
  { ip: "8.8.4.4", name: "Google DNS", location: "Global (Anycast)", tier: 1 },

  // Quad9 DNS (fast, security-focused, excellent global presence)
  { ip: "9.9.9.9", name: "Quad9 DNS", location: "Global (Anycast)", tier: 1 },
  { ip: "149.112.112.112", name: "Quad9 DNS", location: "Global (Anycast)", tier: 1 },

  // ========== TIER 2: VERY GOOD - Reliable, Proven Performance ==========

  // OpenDNS (Cisco) - established, reliable, good performance
  { ip: "208.67.222.222", name: "OpenDNS (Standard)", location: "Global (Anycast, Cisco)", tier: 2 },
  { ip: "208.67.220.220", name: "OpenDNS (Standard)", location: "Global (Anycast, Cisco)", tier: 2 },

  // Verisign Public DNS (stable, privacy-respecting, reliable)
  { ip: "64.6.64.6", name: "Verisign DNS", location: "USA (Global Anycast)", tier: 2 },
  { ip: "64.6.65.6", name: "Verisign DNS", location: "USA (Global Anycast)", tier: 2 },

  // AdGuard DNS (good anycast network, privacy-focused)
  { ip: "94.140.14.14", name: "AdGuard DNS (Unfiltered)", location: "Global (Anycast)", tier: 2 },
  { ip: "94.140.15.15", name: "AdGuard DNS (Unfiltered)", location: "Global (Anycast)", tier: 2 },

  // Control D (modern, reliable, good free tier)
  { ip: "76.76.2.0", name: "Control D (Unfiltered)", location: "Global (Anycast)", tier: 2 },
  { ip: "76.76.10.0", name: "Control D (Unfiltered)", location: "Global (Anycast)", tier: 2 },

  // ========== TIER 3: GOOD - Solid Alternatives ==========

  // Neustar / UltraDNS (enterprise-grade, reliable)
  { ip: "156.154.70.1", name: "Neustar UltraDNS (Standard)", location: "USA (Anycast)", tier: 3 },
  { ip: "156.154.71.1", name: "Neustar UltraDNS (Standard)", location: "USA (Anycast)", tier: 3 },

  // DNS.WATCH (neutral, no logging, privacy-focused)
  { ip: "84.200.69.80", name: "DNS.WATCH", location: "Germany (Global Anycast)", tier: 3 },
  { ip: "84.200.70.40", name: "DNS.WATCH", location: "Germany (Global Anycast)", tier: 3 },

  // Comodo Secure DNS (security-focused, decent performance)
  { ip: "8.26.56.26", name: "Comodo Secure DNS", location: "USA (Global Anycast)", tier: 3 },
  { ip: "8.20.247.20", name: "Comodo Secure DNS", location: "USA (Global Anycast)", tier: 3 },

  // CleanBrowsing (good for content filtering, reliable)
  { ip: "185.228.168.9", name: "CleanBrowsing (Security)", location: "Global (Anycast)", tier: 3 },
  { ip: "185.228.169.9", name: "CleanBrowsing (Security)", location: "Global (Anycast)", tier: 3 },

  // CIRA Canadian Shield (excellent for Canada, good globally)
  { ip: "149.112.121.10", name: "CIRA Canadian Shield (Private)", location: "Canada (Global Anycast)", tier: 3 },
  { ip: "149.112.122.10", name: "CIRA Canadian Shield (Private)", location: "Canada (Global Anycast)", tier: 3 },

  // ========== TIER 4: BACKUP - Legacy, Regional, or Niche Providers ==========

  // Level 3 / CenturyLink (legacy, still functional but aging)
  { ip: "4.2.2.1", name: "Level3 DNS", location: "USA (Anycast)", tier: 4 },
  { ip: "4.2.2.2", name: "Level3 DNS", location: "USA (Anycast)", tier: 4 },
  { ip: "4.2.2.3", name: "Level3 DNS", location: "USA (Anycast)", tier: 4 },
  { ip: "4.2.2.4", name: "Level3 DNS", location: "USA (Anycast)", tier: 4 },

  // Hurricane Electric (single IP, transit provider, decent backup)
  { ip: "74.82.42.42", name: "Hurricane Electric DNS", location: "USA (Global Anycast)", tier: 4 },

  // Yandex DNS (best for Russia/CIS, decent elsewhere)
  { ip: "77.88.8.8", name: "Yandex DNS (Basic)", location: "Russia (Global Anycast)", tier: 4 },
  { ip: "77.88.8.1", name: "Yandex DNS (Basic)", location: "Russia (Global Anycast)", tier: 4 },

  // Dyn DNS (Oracle-owned, historical, less optimal now)
  { ip: "216.146.35.35", name: "Dyn DNS", location: "USA (Anycast)", tier: 4 },
  { ip: "216.146.36.36", name: "Dyn DNS", location: "USA (Anycast)", tier: 4 },

  // SafeDNS (smaller provider, cloud-based)
  { ip: "195.46.39.39", name: "SafeDNS", location: "USA (Global Anycast)", tier: 4 },
  { ip: "195.46.39.40", name: "SafeDNS", location: "USA (Global Anycast)", tier: 4 },

  // FreeDNS (niche, Austria-based, privacy-focused)
  { ip: "37.235.1.174", name: "FreeDNS", location: "Austria (Global)", tier: 4 },
  { ip: "37.235.1.177", name: "FreeDNS", location: "Austria (Global)", tier: 4 },

  // UncensoredDNS (Denmark, smaller network, anti-censorship focus)
  { ip: "91.239.100.100", name: "UncensoredDNS", location: "Denmark (Global)", tier: 4 },
  { ip: "89.233.43.71", name: "UncensoredDNS", location: "Denmark (Global)", tier: 4 },

  // Alternate DNS (smaller provider, ad-blocking)
  { ip: "76.76.19.19", name: "Alternate DNS", location: "USA (Anycast)", tier: 4 },
  { ip: "76.223.122.150", name: "Alternate DNS", location: "USA (Anycast)", tier: 4 },

  // OpenNIC (community-run, alternative DNS roots, experimental)
  { ip: "138.197.140.189", name: "OpenNIC", location: "USA (Community)", tier: 4 },
  { ip: "137.220.55.93", name: "OpenNIC", location: "USA (Community)", tier: 4 },
];

/**
 * Modifies TTL values in a DNS response buffer.
 * 
 * @param response - The DNS response buffer to modify.
 * @param newTTL - The new TTL value in seconds.
 * @returns The modified DNS response buffer.
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

// Function to forward DNS query to Global DNS
/**
 * Forwards a DNS query to randomly selected global DNS server.
 * The first server to respond wins, providing faster resolution times.
 * @param msg - The DNS query message as a Buffer.
 * @param rinfo - Remote information of the requester.
 * @param queryName - The domain name being queried.
 * @param IO - An instance of InputOutputHandler for building and sending responses.
 * @param customTTL - Optional custom TTL value to set in the response.
 * @returns A Promise that resolves to the DNS response Buffer or null if no response is received.
 */
export default function GlobalDNSforwarder(msg: Buffer, rinfo: dgram.RemoteInfo, queryName: string, IO: InputOutputHandler, customTTL: number | null = null): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let client: dgram.Socket | null = null;
    let timeout: NodeJS.Timeout;

    // Fisher-Yates shuffle to randomize DNS servers
    function shuffleArray(array: any[]) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }


    function tryNext(tier?: number) {
      let currentTier = tier ?? 1;
      let tierServers = GlobalDNS.filter(dns => dns.tier === currentTier);

      // If no servers left in current tier, move to next tier
      if (tierServers.length === 0) {
        currentTier++;
        tierServers = GlobalDNS.filter(dns => dns.tier === currentTier);
      }

      // Shuffle the servers in the current tier for randomness
      shuffleArray(tierServers);

      if (tierServers.length === 0) {
        if (client) client.close();
        Console.red(`No response from any DNS server for ${queryName}`);
        IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
        return resolve(null); // no response from any
      }

      // Get the next random DNS server (already shuffled)
      const dnsIP = tierServers.pop();
      if (!dnsIP) {
        IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
        return resolve(null);
      }
      client = dgram.createSocket("udp4");
      Console.bright(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip}) location: ${dnsIP.location} with TTL: ${customTTL ?? "original TTL"} With Help of Worker: ${process.pid}`);

      timeout = setTimeout(() => {
        client?.close();
        tryNext(currentTier + 1); // try next in next tier on timeout
      }, 2000); // 2 sec per server

      client.once("message", (response) => {
        clearTimeout(timeout);
        client?.close();

        // Modify TTL if customTTL is provided
        if (customTTL !== null) {
          const modifiedResponse = modifyResponseTTL(response, customTTL);
          resolve(modifiedResponse);
        } else {
          resolve(response); // got an answer ✅
        }
      });

      client.once("error", () => {
        clearTimeout(timeout);
        client?.close();
        tryNext(currentTier + 1); // try next in next tier on error
      });

      client.send(msg, 53, dnsIP.ip);
    }

    tryNext(1); // Start with tier 1
  });
}