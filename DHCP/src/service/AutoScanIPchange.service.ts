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

      // Ignore unreliable readings (interface down / renumbering / not-ready).
      // Writing "nameserver 0.0.0.0" into resolv.conf would break host-wide DNS
      // until the next distinct change — never propagate a non-routable address.
      if (!IP_SCAN.isUsableIPv4(currentIP)) {
        return;
      }

      this.CURRENT_IP = currentIP;
      if (this.CURRENT_IP !== this.PREVIOUS_IP) {
        console.log(`IP Change Detected: ${this.PREVIOUS_IP} -> ${this.CURRENT_IP}`);
        try {
          await this.publishFn();
          await new UpdateResolveConfigFileService(this.CURRENT_IP).updateConfig();
          // Only advance PREVIOUS_IP after publish + write BOTH succeed, so a
          // failed update is retried on the next tick instead of being lost.
          this.PREVIOUS_IP = this.CURRENT_IP;
        } catch (error) {
          console.error('[IP_SCAN] Failed to propagate IP change, will retry next tick:', error);
        }
      }
    }, 10, true);
  }

  /** True only for a real, routable-looking IPv4 (rejects 0.0.0.0/empty/sentinels). */
  private static isUsableIPv4(ip: string): boolean {
    if (!ip || ip === "0.0.0.0") return false;
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === p;
    });
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
