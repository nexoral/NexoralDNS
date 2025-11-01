/* eslint-disable @typescript-eslint/no-explicit-any */
import dgram from "dgram";
import { Console } from "outers"

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
 * Forwards a DNS query to a list of global DNS servers in random order until a response is received or all servers fail to respond.
 *
 * @param msg - The DNS query message as a Buffer.
 * @param queryName - The domain name being queried.
 * @param customTTL - Optional custom TTL value in seconds to override the response TTL (defaults to null, keeping original TTL).
 * @returns A Promise that resolves with the DNS response Buffer if successful, or `null` if no server responds.
 *
 * The function randomly selects DNS servers from the `GlobalDNS` array, waiting up to 2 seconds for a response from each.
 * If a server does not respond or an error occurs, it proceeds to another randomly selected server.
 * The process continues until a response is received or all servers have been tried.
 * If customTTL is provided, all TTL values in the response will be modified to use the custom value.
 */
export default function GlobalDNSforwarder(msg: Buffer, queryName: string, customTTL: number | null = null): Promise<Buffer | null> {
  return new Promise((resolve) => {
    // Create a copy of the GlobalDNS array to shuffle
    const availableDNS = [...GlobalDNS];
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

    // Shuffle the DNS servers
    shuffleArray(availableDNS);

    function tryNext() {
      if (availableDNS.length === 0) {
        if (client) client.close();
        Console.red(`No response from any DNS server for ${queryName}`);
        return resolve(null); // no response from any
      }

      // Get the next random DNS server (already shuffled)
      const dnsIP = availableDNS.pop();
      if (!dnsIP) {
        return resolve(null);
      }
      client = dgram.createSocket("udp4");
      Console.bright(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip}) location: ${dnsIP.location} with TTL: ${customTTL ?? "original TTL"} With Help of Worker: ${process.pid}`);

      timeout = setTimeout(() => {
        client?.close();
        tryNext(); // try next random DNS
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
        tryNext(); // try next random DNS
      });

      client.send(msg, 53, dnsIP.ip);
    }

    tryNext();
  });
}