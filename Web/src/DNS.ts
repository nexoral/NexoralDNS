import dgram from "dgram";

// Utility to get local IP address
import getLocalIP from "./utilities/GetWLANIP.utls";
// DNS forwarder service
import GlobalDNSforwarder from "./services/GlobalDNSforwarder.service";
// Input/Output handler for UDP messages
import InputOutputHandler from "./utilities/BuildAnswer.utls";

const server = dgram.createSocket("udp4");

const inputOutputHandler = new InputOutputHandler(server);

// Google Web IP (one of Google's web servers)
const GOOGLE_IP = "1.1.1.1";
const DOMAIN = "ankan.nanga";

// Handle incoming DNS queries
server.on("message", async (msg, rinfo) => {
  // Parse query name
  let offset = 12;
  const labels: string[] = [];
  while (msg[offset] !== 0) {
    const length = msg[offset];
    labels.push(msg.subarray(offset + 1, offset + 1 + length).toString());
    offset += length + 1;
  }
  const queryName = labels.join(".");

  if (queryName === DOMAIN) {
    // Use buildSendAnswer method from utilities
    const response = inputOutputHandler.buildSendAnswer(msg, rinfo, DOMAIN, GOOGLE_IP);
    if (!response) {
      console.error(`Failed to respond to ${queryName}`);
    }
  } else {
    // Forward to Google DNS for non-matching domains
    try {
      const forwardedResponse = await GlobalDNSforwarder(msg, queryName);
      if (forwardedResponse) {
        const resp: boolean = inputOutputHandler.sendRawAnswer(forwardedResponse, rinfo);
        if (!resp) {
          console.error(`Failed to forward ${queryName} to Global DNS`);
        }
      }
    } catch (error) {
      console.error(`Failed to forward ${queryName} to Global DNS:`, error);
    }

    // Use buildSendAnswer with no matching domain (will return empty answer)
    const response = inputOutputHandler.buildSendAnswer(msg, rinfo, DOMAIN, GOOGLE_IP);
    if (!response) {
      console.error(`Failed to respond to ${queryName}`);
    }
  }
});

server.on("listening", () => {
  const address = server.address();
  console.log(`DNS server running at udp://${address.address}:${address.port}`);
});

// Run on 5353 (non-root). Use 53 if root/admin
server.bind(53, getLocalIP("any"));
