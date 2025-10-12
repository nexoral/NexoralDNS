import net from 'net';
import { ServerKeys } from '../Config/key';
import { createMessage, parseMessage } from './parser.broker';
import { getEventHandler } from './EventMapper.broker';

export default function createTCPBroker() {
  // Create a TCP server
  const server = net.createConnection({ port: Number(ServerKeys.BROKER_PORT) }, () => {
    console.log(`Broker Client server listening on port ${ServerKeys.BROKER_PORT}`);
  });

  // send a message to the server
  server.write(createMessage({ type: 'register', service: 'NexoralDNS_CORE' }));

  server.on("data", (data) => {
    const messageObject = parseMessage(data);
    if (messageObject.type ==="message") {
      console.log("Received message:", messageObject.event);
      const getFunction = getEventHandler(String(messageObject.event));
      if (getFunction) {
        getFunction();
      } else {
        console.log(`No handler found for event: ${messageObject.event}`);
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