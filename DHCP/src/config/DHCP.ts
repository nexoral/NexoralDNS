import net from 'net';
import { ServerKeys } from './key';
import { createMessage, parseMessage } from './parser.broker';

export default function createTCPBroker() {
  // Create a TCP server
  const server = net.createConnection({ port: Number(ServerKeys.BROKER_PORT) }, () => {
    console.log(`Broker Client server listening on port ${ServerKeys.BROKER_PORT}`);
  });

  // send a message to the server
  server.write(createMessage({ type: 'register', service: 'DHCP_SERVER' }));

  // Example of sending an event invocation message
  server.write(createMessage({ type: "message", targetService: "NexoralDNS", event: "INVOKE_IP_FETCH" }));

  server.on("data", (data) => {
    const messageObject = parseMessage(data);
    if (messageObject.type === "message") {
      console.log("Received message:", messageObject);
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

createTCPBroker();