import path from "path";
import fs from "fs/promises";

export default class UpdateResolveConfigFileService {
  // Serializes all resolv.conf writes across instances/ticks so overlapping
  // updates can never interleave writes to the same critical system file.
  private static writeChain: Promise<void> = Promise.resolve();

  private readonly configPath: string;
  private readonly localIP: string = "127.0.0.53";
  private readonly IP: string;

  constructor(currentIP?: string) {
    this.configPath = path.resolve("/etc/resolv.conf");
    this.IP = currentIP?.trim() || this.localIP;
  }

  public async updateConfig(): Promise<void> {
    const run = UpdateResolveConfigFileService.writeChain.then(() => this.doUpdate());
    // Keep the chain alive even if this write rejects; still surface the error to caller.
    UpdateResolveConfigFileService.writeChain = run.catch(() => { });
    return run;
  }

  private async doUpdate(): Promise<void> {
    console.log(`🔧 Updating ${this.configPath} with nameserver ${this.IP}...`);

    try {
      // Read existing resolv.conf (tolerate a missing file — we recreate it).
      let originalData = "";
      try {
        originalData = await fs.readFile(this.configPath, "utf-8");
      } catch {
        originalData = "";
      }

      // Only touch nameserver lines — never the `search` (domain-suffix) directive.
      let updatedData: string;
      if (/^\s*nameserver\s+\S+/m.test(originalData)) {
        updatedData = originalData.replace(/^\s*nameserver\s+\S+/gm, `nameserver ${this.IP}`);
      } else {
        updatedData = `${originalData}${originalData.endsWith("\n") || originalData === "" ? "" : "\n"}nameserver ${this.IP}\n`;
      }

      // Atomic write: temp file on the same filesystem + rename over the target,
      // so a killed/partial write can never truncate the live resolv.conf.
      const tmpPath = `${this.configPath}.${process.pid}.tmp`;
      await fs.writeFile(tmpPath, updatedData, "utf-8");
      await fs.rename(tmpPath, this.configPath);

      console.log("✅ Resolve config file updated successfully!");
    } catch (error) {
      console.error("❌ Error updating resolve config file:", error);
      throw error; // propagate so the scanner does not advance PREVIOUS_IP on failure
    }
  }
}
