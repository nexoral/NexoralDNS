import net from 'net';
import { ServerKeys } from './key';
import { createMessage, parseMessage } from './parser.broker';
import IP_SCAN from '../service/AutoScanIPchange.service';

export default function createTCPBroker() {
  // Create a TCP server
  const server = net.createConnection({ port: Number(ServerKeys.BROKER_PORT) }, () => {
    console.log(`Broker Client server listening on port ${ServerKeys.BROKER_PORT}`);
  });

  // register the service upon connection
   new IP_SCAN(server).scan();

  // send a message to the server
  server.write(createMessage({ type: 'register', service: 'DHCP_SERVER' }));

  server.on("data", (data) => {
    const messageObject = parseMessage(data);
    if (messageObject.type === "message") {
      console.log("Received message:", messageObject);
    }
    else if (messageObject.type === "response") {
      if (messageObject.status === "success") {
        console.log("Response received:", messageObject);
      }
    }
  });

  server.on("end", () => {
    console.log("Client disconnected");
    server.destroy();
  });

  server.on("error", (err) => {
    console.error("Socket error:", err);
    server.destroy();
    setTimeout(createTCPBroker, 1000); // try to reconnect after 1 second
  });
}

// Run the server if this file is executed directly
if (process.argv[1] === __filename) {
  createTCPBroker();
}