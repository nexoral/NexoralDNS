import net from 'net';
import { ServerKeys } from '../core/key';
import { createMessage, parseMessage } from './parser.broker';
import { parse } from 'path';

export default function createTCPBroker() {
  // Create a TCP server
  const server = net.createConnection({ port: Number(ServerKeys.BROKER_PORT) }, () => {
    console.log(`Broker Client server listening on port ${ServerKeys.BROKER_PORT}`);
  });

  // send a message to the server
  server.write(createMessage({ type: 'register', service: 'NexoralDNS' }));

  server.on("data", (data) => {
    const messageObject = parseMessage(data);
    console.log("Received:", messageObject);
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