/* eslint-disable @typescript-eslint/no-unused-vars */
// dns-server.ts
import dgram from "dgram";
import getLocalIP from "./utilities/GetWLANIP.utls";
import GlobalDNSforwarder from "./services/GlobalDNSforwarder.service";

const server = dgram.createSocket("udp4");

// Google Web IP (one of Google's web servers)
const GOOGLE_IP = "1.1.1.1";
const DOMAIN = "ankan.test";




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
    // Forward to Google DNS for non-matching domains
    try {
      const forwardedResponse = await GlobalDNSforwarder(msg, queryName);
      if (forwardedResponse) {
        server.send(forwardedResponse, rinfo.port, rinfo.address);
        return;
      }
    } catch (error) {
      console.error(`Failed to forward ${queryName} to Google DNS:`, error);
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
server.bind(53, getLocalIP("any"));
