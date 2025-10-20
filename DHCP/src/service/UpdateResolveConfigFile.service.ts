import path from "path";
import fs from "fs/promises";

export default class UpdateResolveConfigFileService {
  private readonly configPath: string;
  private readonly backupPath: string;
  private readonly localIP: string = "127.0.0.53";
  private readonly IP: string;

  constructor(currentIP?: string) {
    this.configPath = path.resolve("/etc/resolv.conf");
    this.backupPath = path.resolve(`/tmp/${this.configPath}.backup`);
    this.IP = currentIP?.trim() || this.localIP;
  }

  public async updateConfig(): Promise<void> {
    console.log(`🔧 Updating ${this.configPath} with nameserver ${this.IP}...`);
    let backupCreated = false;

    try {
      // Step 1: Read existing resolv.conf
      const originalData = await fs.readFile(this.configPath, "utf-8");

      // Step 2: Create backup
      await fs.writeFile(this.backupPath, originalData, "utf-8");
      backupCreated = true;
      console.log("✅ Backup created at:", this.backupPath);

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

      // Step 4: Write to temporary file first (atomic write)
      const tempPath = `${this.configPath}.tmp`;
      await fs.writeFile(tempPath, updatedData, "utf-8");
      await fs.rename(tempPath, this.configPath);

      console.log("✅ Resolve config file updated successfully!");
    } catch (error) {
      console.error("❌ Error updating resolve config file:", error);

      // Step 5: Rollback if backup exists
      if (backupCreated) {
        try {
          const backupData = await fs.readFile(this.backupPath, "utf-8");
          await fs.writeFile(this.configPath, backupData, "utf-8");
          console.log("🔁 Rolled back to previous configuration.");
        } catch (rollbackError) {
          console.error("🚨 Rollback failed! Manual intervention required:", rollbackError);
        }
      }
    } finally {
      // Step 6: Cleanup backup if no longer needed (optional)
      try {
        await fs.unlink(this.backupPath);
      } catch {
        // Ignore if file doesn’t exist
      }
    }
  }
}
