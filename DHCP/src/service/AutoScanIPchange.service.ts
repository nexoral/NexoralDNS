import { Socket } from "node:net";
import os from "os";
import { Retry } from "outers";
import { createMessage } from "../config/parser.broker";


export default class IP_SCAN {
  private CURRENT_IP: string = "";
  private PREVIOUS_IP: string = "";
  private readonly socket: Socket;

  constructor(server: Socket) {
    this.CURRENT_IP = "<current_ip>";
    this.PREVIOUS_IP = "<previous_ip>";
    this.socket = server;
  }

  public async scan(): Promise<void> {
    Retry.Seconds(async () => {
      const currentIP = await this.getCurrentIP();
      this.CURRENT_IP = currentIP;
      if (this.CURRENT_IP !== this.PREVIOUS_IP) {
        console.log(`IP Change Detected: ${this.PREVIOUS_IP} -> ${this.CURRENT_IP}`);
        this.PREVIOUS_IP = this.CURRENT_IP;
          this.socket.write(createMessage({ type: "message", targetService: "NexoralDNS", event: "INVOKE_IP_FETCH" }));
      }
    }, 10, true)
  }

  public async getCurrentIP(): Promise<string> {
    const nets = os.networkInterfaces();

    // Fallback: return the first available IPv4 if no 192.x found
    for (const name of Object.keys(nets)) {
      const netList = nets[name];
      if (!netList) continue;

      for (const net of netList) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    
    // Return a default value if no valid IP is found
    return "0.0.0.0";
  }
}