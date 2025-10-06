import { Socket } from "net";

const ClientsDB = new Map<string, { portNumber: number, socket: Socket }>();

export function addClient(id: string, portNumber: number, socket: Socket) {
  ClientsDB.set(id, { portNumber, socket });
}

export function removeClient(portNumber: number) {
  for (const [id, client] of ClientsDB.entries()) {
    if (client.portNumber === portNumber) {
      ClientsDB.delete(id);
      break;
    }
  }
}

export function getClient(id: string): Socket | undefined {
  return ClientsDB.get(id)?.socket;
}