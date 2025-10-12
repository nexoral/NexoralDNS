export interface Message {
  type: "register" | "message" | "response";
  service?: string; // for register
  targetService?: string; // for message
  event?: string; // for message
  payload?: any; // for message
  status?: string; // for response
  message?: string; // for response
}

export const parseMessage = (msg: Buffer): Message => {
  return JSON.parse(msg.toString());
};

export const createMessage = (message: Message): Buffer => {
  return Buffer.from(JSON.stringify(message));
};