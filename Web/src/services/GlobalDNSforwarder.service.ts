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

// Function to forward DNS query to Global DNS
/**
 * Forwards a DNS query to a list of global DNS servers sequentially until a response is received or all servers fail to respond.
 *
 * @param msg - The DNS query message as a Buffer.
 * @param queryName - The domain name being queried.
 * @returns A Promise that resolves with the DNS response Buffer if successful, or `null` if no server responds.
 *
 * The function attempts to send the DNS query to each server in the `GlobalDNS` array, waiting up to 2 seconds for a response from each.
 * If a server does not respond or an error occurs, it proceeds to the next server.
 * The process continues until a response is received or all servers have been tried.
 */
export default function GlobalDNSforwarder(msg: Buffer, queryName: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let index = 0;
    let client: dgram.Socket | null = null;
    let timeout: NodeJS.Timeout;

    function tryNext() {
      if (index >= GlobalDNS.length) {
        if (client) client.close();
        Console.red(`No response from any DNS server for ${queryName}`);
        return resolve(null); // no response from any
      }

      const dnsIP = GlobalDNS[index++];
      client = dgram.createSocket("udp4");
      Console.bright(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip}) location: ${dnsIP.location}`);

      timeout = setTimeout(() => {
        client?.close();
        tryNext(); // try next DNS
      }, 2000); // 2 sec per server

      client.once("message", (response) => {
        clearTimeout(timeout);
        client?.close();
        resolve(response); // got an answer ✅
      });

      client.once("error", () => {
        clearTimeout(timeout);
        client?.close();
        tryNext(); // try next DNS
      });

      client.send(msg, 53, dnsIP.ip);
    }

    tryNext();
  });
}