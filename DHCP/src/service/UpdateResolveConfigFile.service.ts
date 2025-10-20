import path from "path";
import fs from "fs/promises";

export default class UpdateResolveConfigFileService {
  private readonly configPath: string;
  private readonly localIP: string = "127.0.0.53";
  private readonly IP: string;

  constructor(currentIP?: string) {
    this.configPath = path.resolve("/etc/resolv.conf");
    this.IP = currentIP?.trim() || this.localIP;
  }

  public async updateConfig(): Promise<void> {
    console.log(`🔧 Updating ${this.configPath} with nameserver ${this.IP}...`);
    let backupCreated = false;

    try {
      // Step 1: Read existing resolv.conf
      const originalData = await fs.readFile(this.configPath, "utf-8");

      // Step 3: Update content
      let updatedData = originalData;

      if (/^\s*nameserver\s+\S+/m.test(updatedData)) {
        // Replace all nameserver lines
        updatedData = updatedData.replace(/^\s*nameserver\s+\S+/gm, `nameserver ${this.IP}`);
      } else {
        // Add new nameserver if not present
        updatedData += `\nnameserver ${this.IP}\n`;
      }

      // (Optional) If you want to update search line — only if it exists
      if (/^\s*search\s+\S+/m.test(updatedData)) {
        updatedData = updatedData.replace(/^\s*search\s+\S+/gm, `search ${this.IP}`);
      }

      // Write the updated data back to the original file
      await fs.writeFile(this.configPath, updatedData, "utf-8");

      console.log("✅ Resolve config file updated successfully!");
    } catch (error) {
      console.error("❌ Error updating resolve config file:", error);

    } 
  }
}
