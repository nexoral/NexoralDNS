import net from "node:net";
import { BROKER_PORT } from "./key";
import { addClient, getClient, removeClient } from "../Database/Clients.db";
import { createMessage, parseMessage } from "../helper/parser.helper";

export interface Message {
  type: "register" | "message" | "response";
  service?: string; // for register
  targetService?: string; // for message
  event?: string; // for message
  payload?: any; // for message
  status?: string; // for response
  message?: string; // for response
}

// Create a TCP server
const server = net.createServer((socket) => {

  // Handle incoming data from clients
  socket.on("data", (msg) => {
    const messageObject: Message = parseMessage(msg);
    
    if (messageObject.type ==="register") {
      addClient(String(messageObject?.service), Number(socket.remotePort), socket);
      console.log(`Service Registered: ${messageObject.service} from port ${socket.remotePort}`);
    } else if (messageObject.type === "message") {
      const targetSocket = getClient(String(messageObject.targetService));
      if (targetSocket) {
        targetSocket.write(JSON.stringify({
          event: messageObject.event,
          payload: messageObject.payload ? messageObject.payload : null
        }));
        console.log(`Message sent to ${messageObject.targetService}`);
        socket.write(createMessage({ type: "response", status: "success", message: `Message sent to ${messageObject.targetService}` }));
      } else {
        socket.write(createMessage({ type: "response", status: "error", message: `Service ${messageObject.targetService} not found` }));
      }
    }   
  });

  // Handle client disconnection
  socket.on("end", () => {
    console.log("Client disconnected", socket.remotePort);
    removeClient(Number(socket.remotePort));
    socket.destroy();
  });

  // Handle errors
  socket.on("error", (err) => {
    console.error("Socket error:", err);
    removeClient(Number(socket.remotePort));
    socket.destroy();
  });
});

// Start the server and listen on port 56300
server.listen(BROKER_PORT, () => {
  console.log(`Broker server listening on port ${BROKER_PORT}`);
});