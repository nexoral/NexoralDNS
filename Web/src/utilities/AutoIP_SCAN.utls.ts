import { Socket, createSocket } from "node:dgram";
import os from "os";
import { Retry } from "outers";

export default class IP_SCAN {
  private CURRENT_IP: string = "";
  private PREVIOUS_IP: string = "";
  private socket: Socket;
  private readonly onRebind?: (newSocket: Socket) => void;

  constructor(currentIP: string, server: Socket, onRebind?: (newSocket: Socket) => void) {
    this.CURRENT_IP = currentIP;
    this.PREVIOUS_IP = currentIP;
    this.socket = server;
    this.onRebind = onRebind;
  }

  public async scan(): Promise<void> {
    Retry.Seconds(async () => {
      const currentIP = await this.getCurrentIP();
      this.CURRENT_IP = currentIP;
      if (this.CURRENT_IP !== this.PREVIOUS_IP) {
        console.log(`IP Change Detected: ${this.PREVIOUS_IP} -> ${this.CURRENT_IP}`);
        this.PREVIOUS_IP = this.CURRENT_IP;

        this.socket.close(() => {
          console.log(`Rebinding DNS server to new IP: ${this.CURRENT_IP}`);
          
          // Create new socket since closed sockets cannot be reused
          const newSocket = createSocket('udp4');
          this.socket = newSocket;
          
          // Bind to new IP
          this.socket.bind(53, this.CURRENT_IP);
          
          // Notify parent with new socket instance if callback provided
          if (this.onRebind) {
            this.onRebind(this.socket);
          }
        });

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