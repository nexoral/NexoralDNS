import os from "os";
import { Retry } from "outers";
import UpdateResolveConfigFileService from "./UpdateResolveConfigFile.service";

export default class IP_SCAN {
  private CURRENT_IP: string = "";
  private PREVIOUS_IP: string = "";
  private readonly publishFn: () => Promise<void>;

  constructor(publishFn: () => Promise<void>) {
    this.CURRENT_IP = "<current_ip>";
    this.PREVIOUS_IP = "<previous_ip>";
    this.publishFn = publishFn;
  }

  public async scan(): Promise<void> {
    Retry.Seconds(async () => {
      const currentIP = await this.getCurrentIP();
      this.CURRENT_IP = currentIP;
      if (this.CURRENT_IP !== this.PREVIOUS_IP) {
        console.log(`IP Change Detected: ${this.PREVIOUS_IP} -> ${this.CURRENT_IP}`);
        this.PREVIOUS_IP = this.CURRENT_IP;
        await this.publishFn();
        new UpdateResolveConfigFileService(this.CURRENT_IP).updateConfig();
      }
    }, 10, true);
  }

  public async getCurrentIP(): Promise<string> {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      const netList = nets[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    return "0.0.0.0";
  }
}
