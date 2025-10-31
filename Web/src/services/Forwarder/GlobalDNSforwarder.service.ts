import dgram from "dgram";
import { Console } from "outers"
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

  // Quad9 DNS (security-focused, no filtering)
  { ip: "9.9.9.9", name: "Quad9 DNS", location: "Global (Anycast)" },
  { ip: "149.112.112.112", name: "Quad9 DNS", location: "Global (Anycast)" },

  // Public DNS servers in India
  { ip: "103.123.226.10", name: "Public DNS", location: "Mumbai, India" },
  { ip: "119.235.48.3", name: "Public DNS", location: "Hyderabad, India" },
  { ip: "1.186.242.240", name: "Public DNS", location: "Mumbai, India" },
  { ip: "1.22.212.214", name: "Public DNS", location: "Ghaziabad, India" },
  { ip: "180.179.214.190", name: "Airtel Public DNS", location: "India (ISP)" },
  { ip: "203.145.184.14", name: "Reliance Jio DNS", location: "India (ISP)" },
  { ip: "202.88.149.25", name: "Tata Communications DNS", location: "India (ISP)" },
  { ip: "218.248.255.194", name: "BSNL Public DNS", location: "India (ISP)" },
  { ip: "103.14.30.121", name: "PowerDNS India", location: "Pune, India" },
  { ip: "182.19.95.34", name: "Spectra ISP DNS", location: "Delhi, India" },

  // Public DNS servers in the UK
  { ip: "185.121.177.177", name: "OpenNIC (UK Node)", location: "London, UK" },
  { ip: "51.38.83.141", name: "FreeDNS UK", location: "Manchester, UK" },
  { ip: "194.168.4.100", name: "Virgin Media DNS", location: "UK (ISP)" },
  { ip: "212.58.213.217", name: "BBC R&D DNS Test", location: "London, UK" },

  // Public DNS servers in Germany
  { ip: "84.200.69.80", name: "DNS.Watch", location: "Germany (Anycast)" },
  { ip: "84.200.70.40", name: "DNS.Watch", location: "Germany (Anycast)" },
  { ip: "194.150.168.168", name: "CyberGhost DNS", location: "Germany (VPN provider)" },
  { ip: "193.29.206.206", name: "Digitalcourage DNS", location: "Bielefeld, Germany" },

  // Public DNS servers in Japan
  { ip: "203.80.96.10", name: "Japan Internet Exchange (JPIX)", location: "Tokyo, Japan" },
  { ip: "202.12.27.33", name: "IIJ Public DNS", location: "Tokyo, Japan" },
  { ip: "203.80.96.9", name: "KDDI DNS", location: "Tokyo, Japan" },
  { ip: "210.196.3.183", name: "Sony Global DNS", location: "Tokyo, Japan" },

  // Public DNS servers in Singapore
  { ip: "165.21.83.88", name: "SingNet DNS", location: "Singapore (ISP)" },
  { ip: "165.21.100.88", name: "SingNet DNS", location: "Singapore (ISP)" },
  { ip: "103.6.87.8", name: "StarHub DNS", location: "Singapore (ISP)" },
  { ip: "103.6.87.9", name: "StarHub DNS", location: "Singapore (ISP)" },

  // Public DNS servers in Russia
  { ip: "77.88.8.8", name: "Yandex DNS (Basic)", location: "Russia (Anycast)" },
  { ip: "77.88.8.1", name: "Yandex DNS (Basic)", location: "Russia (Anycast)" },
  { ip: "95.173.136.71", name: "OpenNIC (RU Node)", location: "Moscow, Russia" },
  { ip: "31.172.133.253", name: "FreeDNS (RU Node)", location: "St. Petersburg, Russia" },


  // Public DNS servers in Australia
  { ip: "203.50.2.71", name: "Telstra DNS", location: "Sydney, Australia" },
  { ip: "203.50.2.73", name: "Telstra DNS", location: "Melbourne, Australia" },
  { ip: "202.142.142.142", name: "TPG DNS", location: "Sydney, Australia" },
  { ip: "202.45.64.1", name: "AARNET DNS", location: "Australia (Academic Network)" },

  // Public DNS servers in Brazil
  { ip: "200.160.0.8", name: "NIC.br DNS", location: "São Paulo, Brazil" },
  { ip: "200.189.40.8", name: "Claro DNS", location: "Rio de Janeiro, Brazil" },
  { ip: "201.48.105.11", name: "Oi Telecom DNS", location: "Brasília, Brazil" },
  { ip: "177.207.192.1", name: "Vivo ISP DNS", location: "Brazil (ISP)" },


  // Public DNS servers in Canada
  { ip: "198.27.74.100", name: "OVH DNS", location: "Beauharnois, Canada" },
  { ip: "192.99.19.100", name: "OVH DNS", location: "Montreal, Canada" },
  { ip: "198.50.135.100", name: "Vultr DNS", location: "Toronto, Canada" },
  { ip: "104.247.0.1", name: "DigitalOcean DNS", location: "Toronto, Canada" },

  // Public DNS servers in France
  { ip: "80.67.169.12", name: "FDN DNS", location: "France (Paris)" },
  { ip: "80.67.169.40", name: "FDN DNS", location: "France (Paris)" },
  { ip: "212.85.158.6", name: "Free Telecom DNS", location: "France" },
  { ip: "194.177.32.5", name: "Orange France DNS", location: "France" },

  // Public DNS servers in the Italy
  { ip: "85.37.17.51", name: "Fastweb DNS", location: "Italy" },
  { ip: "62.211.69.150", name: "Telecom Italia DNS", location: "Italy (Rome)" },
  { ip: "151.99.125.1", name: "Wind Tre DNS", location: "Italy" },
  { ip: "80.211.55.102", name: "OpenNIC (IT Node)", location: "Italy (Milan)" },

  // Public DNS servers in the Dubai
  { ip: "213.42.20.20", name: "Etisalat DNS", location: "UAE (Dubai)" },
  { ip: "195.229.241.222", name: "du Telecom DNS", location: "UAE (Dubai)" },
  { ip: "45.90.28.0", name: "NextDNS (Middle East Node)", location: "UAE (Dubai)" },

  // Public DNS servers in South Africa
  { ip: "196.43.34.190", name: "Internet Solutions DNS", location: "South Africa (Johannesburg)" },
  { ip: "196.25.1.9", name: "SAIX DNS", location: "South Africa" },
  { ip: "197.242.144.2", name: "Afrihost DNS", location: "South Africa (Cape Town)" },
  { ip: "168.210.2.2", name: "Telkom SA DNS", location: "South Africa" },
  { ip: "102.132.97.97", name: "Vodacom DNS", location: "South Africa" }


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
 * Forwards a DNS query to a batch of randomly selected global DNS servers using Promise.any.
 * The first server to respond wins, providing faster resolution times.
 *
 * @param msg - The DNS query message as a Buffer.
 * @param rinfo - Remote information about the client making the request.
 * @param queryName - The domain name being queried.
 * @param IO - Input/Output handler for building responses.
 * @param customTTL - Optional custom TTL value in seconds to override the response TTL (defaults to null, keeping original TTL).
 * @returns A Promise that resolves with the DNS response Buffer if successful, or `null` if no server responds.
 *
 * The function randomly selects a batch of 3-5 DNS servers and queries them simultaneously.
 * The first server to respond wins, providing the fastest possible resolution.
 * If all servers fail, it retries with a new batch until all servers are exhausted.
 * If customTTL is provided, all TTL values in the response will be modified to use the custom value.
 */
export default async function GlobalDNSforwarder(msg: Buffer, rinfo: dgram.RemoteInfo, queryName: string, IO: InputOutputHandler, customTTL: number | null = null): Promise<Buffer | null> {
  // Create a copy of the GlobalDNS array to shuffle
  const availableDNS = [...GlobalDNS];

  // Fisher-Yates shuffle to randomize DNS servers
  function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Shuffle the DNS servers once
  shuffleArray(availableDNS);

  /**
   * Query a single DNS server with timeout
   */
  function queryDNSServer(dnsServer: { ip: string; name: string; location: string }): Promise<{ server: typeof dnsServer; response: Buffer }> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket("udp4");
      const timeout = setTimeout(() => {
        client.close();
        reject(new Error(`Timeout for ${dnsServer.name} (${dnsServer.ip})`));
      }, 2000); // 2 sec timeout per server

      client.once("message", (response) => {
        clearTimeout(timeout);
        client.close();

        // Modify TTL if customTTL is provided
        if (customTTL !== null) {
          const modifiedResponse = modifyResponseTTL(response, customTTL);
          resolve({ server: dnsServer, response: modifiedResponse });
        } else {
          resolve({ server: dnsServer, response });
        }
      });

      client.once("error", (err) => {
        clearTimeout(timeout);
        client.close();
        reject(err);
      });

      client.send(msg, 53, dnsServer.ip);
    });
  }

  /**
   * Try a batch of DNS servers using Promise.race to get the fastest response
   */
  async function tryBatch(): Promise<Buffer | null> {
    while (availableDNS.length > 0) {
      // Random batch size between 2 and 5 (or whatever is left)
      const minBatch: number = 2;
      const maxBatch: number = 3;
      const batchSize: number = Math.floor(Math.random() * (maxBatch - minBatch + 1)) + minBatch;

      // Get a batch of DNS servers
      const batch = availableDNS.splice(0, batchSize);

      Console.yellow(`[BATCH] Querying ${batch.length} DNS servers simultaneously for ${queryName}`);

      // Query all servers in the batch simultaneously with result wrapping
      const promises = batch.map(dnsServer =>
        queryDNSServer(dnsServer)
          .then(result => ({ success: true as const, server: result.server, response: result.response }))
          .catch(err => ({ success: false as const, error: err.message }))
      );

      try {
        // Race to get the fastest response (success or failure)
        const result = await Promise.race(promises);

        if (result.success) {
          Console.green(`[SUCCESS] Got fastest response for ${queryName} from ${result.server.name} (${result.server.ip}) at ${result.server.location} | Worker PID: ${process.pid}`);
          return result.response;
        }

        // The fastest response was a failure, but we need to wait for all others
        // to see if any succeed before moving to next batch
        Console.yellow(`[RACE] Fastest server failed, checking remaining servers...`);

        const allResults = await Promise.all(promises);
        const successResult = allResults.find((r): r is { success: true; server: { ip: string; name: string; location: string }; response: Buffer } => r.success);

        if (successResult) {
          Console.green(`[SUCCESS] Got late response for ${queryName} from ${successResult.server.name} (${successResult.server.ip}) at ${successResult.server.location} | Worker PID: ${process.pid}`);
          return successResult.response;
        }

        // All servers in this batch failed
        Console.yellow(`[BATCH FAILED] All ${batch.length} servers in batch failed for ${queryName}, trying next batch...`);

        // Continue to next batch if available
        if (availableDNS.length > 0) {
          continue;
        }
      } catch (err) {
        Console.red(`[BATCH ERROR] Unexpected error in batch: ${err}`);
      }
    }

    // All servers exhausted
    Console.red(`[EXHAUSTED] No response from any DNS server for ${queryName}`);
    IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 10);
    return null;
  }

  return await tryBatch();
}