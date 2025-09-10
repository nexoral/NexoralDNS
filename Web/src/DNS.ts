/* eslint-disable @typescript-eslint/no-unused-vars */
// dns-server.ts
import dgram from "dgram";
import os from "os";
import { exec } from "child_process";

const server = dgram.createSocket("udp4");


function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1"; // fallback
}


// Google Web IP (one of Google's web servers)
const GOOGLE_IP = "1.1.1.1";
const DOMAIN = "ankan.test";

// Function to check if system-resolved is disabled
function isSystemResolvedDisabled(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("systemctl is-active systemd-resolved", (error, stdout) => {
      // If systemd-resolved is inactive/disabled, stdout will be "inactive" or similar
      // If there's an error or it's not found, we assume it's disabled
      resolve(error !== null || stdout.trim() !== "active");
    });
  });
}

// Function to forward DNS query to system-resolved
function forwardToSystemResolved(msg: Buffer, rinfo: dgram.RemoteInfo): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket("udp4");
    const SYSTEMD_RESOLVED_IP = "127.0.0.53";
    const SYSTEMD_RESOLVED_PORT = 53;
    
    // Set timeout for the forwarding request
    const timeout = setTimeout(() => {
      client.close();
      resolve(null);
    }, 5000);
    
    client.on("message", (response) => {
      clearTimeout(timeout);
      client.close();
      resolve(response);
    });
    
    client.on("error", (error) => {
      clearTimeout(timeout);
      client.close();
      reject(error);
    });
    
    client.send(msg, SYSTEMD_RESOLVED_PORT, SYSTEMD_RESOLVED_IP);
  });
}

server.on("message", async (msg, rinfo) => {
  // Transaction ID (first 2 bytes)
  const transactionId = msg.subarray(0, 2);

  // DNS header flags (response, recursion available, no error)
  const flags = Buffer.from([0x81, 0x80]);
  const qdcount = Buffer.from([0x00, 0x01]); // questions = 1
  let ancount = Buffer.from([0x00, 0x01]); // answers = 1 by default
  const nscount = Buffer.from([0x00, 0x00]);
  const arcount = Buffer.from([0x00, 0x00]);

  // Parse query name
  let offset = 12;
  const labels: string[] = [];
  while (msg[offset] !== 0) {
    const length = msg[offset];
    labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
    offset += length + 1;
  }
  const queryName = labels.join(".");
  const question = msg.subarray(12, offset + 5); // QNAME + QTYPE + QCLASS

  // Build answer
  let answer = Buffer.alloc(0);
  if (queryName === DOMAIN) {
    // Name pointer (0xc00c = pointer to offset 12 where QNAME starts)
    const name = Buffer.from([0xc0, 0x0c]);
    const type = Buffer.from([0x00, 0x01]); // A record
    const cls = Buffer.from([0x00, 0x01]); // IN class
    const ttl = Buffer.from([0x00, 0x00, 0x00, 0x3c]); // 60 seconds
    const rdlength = Buffer.from([0x00, 0x04]); // IPv4 = 4 bytes
    const rdata = Buffer.from(GOOGLE_IP.split(".").map((octet) => parseInt(octet)));
    answer = Buffer.concat([name, type, cls, ttl, rdlength, rdata]);
  } else {
    // Check if system-resolved is disabled before forwarding
    const systemResolvedDisabled = await isSystemResolvedDisabled();
    
    if (systemResolvedDisabled) {
      // Forward to system-resolved (typically 127.0.0.53:53) when disabled
      try {
        const forwardedResponse = await forwardToSystemResolved(msg, rinfo);
        if (forwardedResponse) {
          server.send(forwardedResponse, rinfo.port, rinfo.address, () => {
            console.log(`Forwarded ${queryName} to system-resolved for ${rinfo.address}:${rinfo.port}`);
          });
          return;
        }
      } catch (error) {
        console.error(`Failed to forward ${queryName} to system-resolved:`, error);
      }
    }
    
    // No answer if domain doesn't match or forwarding failed
    ancount = Buffer.from([0x00, 0x00]);
  }

  // Construct DNS response
  const response = Buffer.concat([
    transactionId,
    flags,
    qdcount,
    ancount,
    nscount,
    arcount,
    question,
    answer,
  ]);

  server.send(response, rinfo.port, rinfo.address, () => {
    console.log(`Resolved ${queryName} for ${rinfo.address}:${rinfo.port}`);
  });
});

server.on("listening", () => {
  const address = server.address();
  console.log(`DNS server running at udp://${address.address}:${address.port}`);
});

// Run on 5353 (non-root). Use 53 if root/admin
server.bind(53, getLocalIP());
