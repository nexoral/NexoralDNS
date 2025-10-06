import { Message } from "../Core/Broker";

export const parseMessage = (msg: Buffer): Message => {
  return JSON.parse(msg.toString());
};

export const createMessage = (message: Message): Buffer => {
  return Buffer.from(JSON.stringify(message));
};