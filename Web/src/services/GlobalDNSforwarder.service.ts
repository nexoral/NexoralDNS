import dgram from "dgram";

const GlobalDNS: { ip: string; name: string, location: string }[] = [
  // Google Public DNS (completely unrestricted)
  { ip: "8.8.8.8", name: "Google DNS", location: "Global (Anycast)" },
  { ip: "8.8.4.4", name: "Google DNS", location: "Global (Anycast)" },

  // Cloudflare DNS (privacy-focused, but no filtering)
  { ip: "1.1.1.1", name: "Cloudflare DNS", location: "Global (Anycast)" },
  { ip: "1.0.0.1", name: "Cloudflare DNS", location: "Global (Anycast)" },

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
export default function GlobalDNSforwarder(msg: Buffer, queryName: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    let index = 0;
    let client: dgram.Socket | null = null;
    let timeout: NodeJS.Timeout;

    function tryNext() {
      if (index >= GlobalDNS.length) {
        if (client) client.close();
        console.log(`No response from any DNS server for ${queryName}`);
        return resolve(null); // no response from any
      }

      const dnsIP = GlobalDNS[index++];
      client = dgram.createSocket("udp4");
      console.log(`Forwarding ${queryName} to ${dnsIP.name} (${dnsIP.ip}) location: ${dnsIP.location}`);

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