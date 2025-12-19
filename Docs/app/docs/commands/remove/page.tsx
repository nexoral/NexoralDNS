import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function RemoveCommand() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Remove Command</h1>

        <p className="text-xl text-gray-400">
          Completely uninstall NexoralDNS from your system. This command removes all services, data, configurations, and restores your original system settings.
        </p>

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">Critical Warning:</p>
          <p className="text-sm text-gray-300 my-0">
            This action is IRREVERSIBLE! The remove command will permanently delete all DNS records, custom configurations, query logs, cache data, and user settings. Make sure to backup any important data before proceeding.
          </p>
        </div>

        <h2>Command</h2>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s remove" />

        <h2>What It Does</h2>

        <p>
          The remove command performs a complete uninstallation of NexoralDNS from your system. It executes the following operations:
        </p>

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 my-6">
          <p className="text-blue-400 font-semibold mb-2">Removal Process:</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Prompts for confirmation before proceeding</li>
            <li>Stops all running NexoralDNS containers</li>
            <li>Removes all NexoralDNS Docker containers</li>
            <li>Deletes all NexoralDNS Docker images</li>
            <li>Removes all Docker volumes (containing all data)</li>
            <li>Deletes NexoralDNS Docker networks</li>
            <li>Removes NexoralDNS installation directory</li>
            <li>Restores original DNS configuration</li>
            <li>Cleans up system configuration files</li>
            <li>Removes scheduled tasks and cron jobs (if any)</li>
          </ul>
        </div>

        <h2>What Gets Removed</h2>

        <h3>All Services</h3>
        <p>
          Every NexoralDNS service is permanently removed:
        </p>
        <ul>
          <li><strong>DNS Server:</strong> Complete removal including all DNS configurations</li>
          <li><strong>Cache Manager:</strong> All cache data and configurations deleted</li>
          <li><strong>Web Dashboard:</strong> Dashboard application and all user data removed</li>
          <li><strong>Database:</strong> All stored data including query logs permanently deleted</li>
        </ul>

        <h3>All Data</h3>
        <p>
          The following data is permanently deleted:
        </p>
        <ul>
          <li>Custom DNS records and domain mappings</li>
          <li>Block lists and filtering rules</li>
          <li>Query logs and analytics history</li>
          <li>Cache statistics and performance data</li>
          <li>User accounts and authentication credentials</li>
          <li>Dashboard settings and preferences</li>
          <li>API keys and integration tokens</li>
          <li>Backup files (if stored in installation directory)</li>
        </ul>

        <h3>System Configuration</h3>
        <p>
          System settings are restored to pre-installation state:
        </p>
        <ul>
          <li>DNS configuration in <code>/etc/resolv.conf</code> restored to original</li>
          <li>Port 53 and 4000 released and available for other services</li>
          <li>System firewall rules related to NexoralDNS removed</li>
          <li>Systemd services (if any) unregistered and removed</li>
        </ul>

        <h3>What Is NOT Removed</h3>
        <p>
          The following are intentionally preserved:
        </p>
        <ul>
          <li><strong>Docker:</strong> Docker and Docker Compose remain installed</li>
          <li><strong>Dependencies:</strong> System packages installed as dependencies</li>
          <li><strong>Router Settings:</strong> You must manually change router DNS settings</li>
          <li><strong>External Backups:</strong> Backups stored outside the installation directory</li>
        </ul>

        <h2>Confirmation Process</h2>

        <p>
          To prevent accidental deletion, the remove command requires explicit confirmation:
        </p>

        <CopyCodeBlock
          language="text"
          code={`WARNING: This will permanently remove NexoralDNS and ALL data!

This action will delete:
  • All DNS records and configurations
  • Query logs and analytics data
  • User accounts and settings
  • Cache data and statistics

This action is IRREVERSIBLE!

Type 'yes' to confirm removal, or anything else to cancel: `}
        />

        <p>
          You must type <code>yes</code> (case-sensitive) and press Enter to proceed. Any other input will cancel the operation.
        </p>

        <h2>Expected Output</h2>

        <p>
          After confirmation, a successful removal will display:
        </p>

        <CopyCodeBlock
          language="text"
          code={`Confirmation received. Proceeding with removal...

[✓] Stopping all services...
Stopping nexoraldns-dashboard   ... done
Stopping nexoraldns-cache       ... done
Stopping nexoraldns-dns-server  ... done

[✓] Removing containers...
Removing nexoraldns-dashboard   ... done
Removing nexoraldns-cache       ... done
Removing nexoraldns-dns-server  ... done

[✓] Removing images...
Deleted: nexoral/dns-server:latest
Deleted: nexoral/cache-manager:latest
Deleted: nexoral/dashboard:latest

[✓] Removing volumes...
Deleted: nexoraldns_dns-data
Deleted: nexoraldns_cache-data
Deleted: nexoraldns_db-data

[✓] Removing networks...
Deleted: nexoraldns_default

[✓] Removing installation directory...
[✓] Restoring original DNS configuration...
[✓] Cleaning up system files...

NexoralDNS has been completely removed from your system.

Original DNS configuration restored.
All data has been permanently deleted.

Thank you for using NexoralDNS!`}
        />

        <h2>Pre-Removal Backup</h2>

        <p>
          If you want to preserve your data before removal, create a manual backup:
        </p>

        <h3>Backup Custom DNS Records</h3>
        <CopyCodeBlock code="# Export DNS records from dashboard\n# Go to: Settings → Export Data → Download DNS Records\n\n# Or manually backup configuration\nsudo cp -r /var/lib/nexoraldns/dns-config ~/nexoraldns-backup/" />

        <h3>Backup Query Logs</h3>
        <CopyCodeBlock code="# Export query logs from dashboard\n# Go to: Analytics → Export Logs → Download\n\n# Or backup database volume\nsudo docker run --rm -v nexoraldns_db-data:/data -v ~/nexoraldns-backup:/backup \\\n  alpine tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz -C /data ." />

        <h3>Backup User Settings</h3>
        <CopyCodeBlock code="# Export all settings from dashboard\n# Go to: Settings → Export All → Download Configuration" />

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">Backup Recommendation:</p>
          <p className="text-sm text-gray-300 my-0">
            Even if you plan to reinstall NexoralDNS later, backing up your custom configurations can save significant time. DNS records, block lists, and custom rules can be time-consuming to recreate.
          </p>
        </div>

        <h2>Manual Removal Process</h2>

        <p>
          If you prefer to remove components manually or the automated script fails:
        </p>

        <h3>Step 1: Stop and Remove Containers</h3>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose down -v" />

        <h3>Step 2: Remove Images</h3>
        <CopyCodeBlock code="sudo docker rmi $(sudo docker images 'nexoral/*' -q)" />

        <h3>Step 3: Remove Installation Directory</h3>
        <CopyCodeBlock code="sudo rm -rf /path/to/NexoralDNS" />

        <h3>Step 4: Restore DNS Configuration</h3>
        <CopyCodeBlock code="sudo nano /etc/resolv.conf\n# Remove or replace NexoralDNS nameserver entries" />

        <h3>Step 5: Clean Docker System (Optional)</h3>
        <CopyCodeBlock code="# Remove unused Docker resources\nsudo docker system prune -a --volumes" />

        <h2>Post-Removal Steps</h2>

        <h3>Update Router DNS Settings</h3>
        <p>
          After removing NexoralDNS, you must manually update your router&apos;s DNS configuration:
        </p>
        <ol>
          <li>Access your router&apos;s admin panel</li>
          <li>Navigate to DNS or DHCP settings</li>
          <li>Remove your machine&apos;s IP from DNS server settings</li>
          <li>Set DNS to your ISP&apos;s servers or public DNS (e.g., 8.8.8.8, 1.1.1.1)</li>
          <li>Save settings and restart router if needed</li>
        </ol>

        <h3>Release Static IP Reservation</h3>
        <p>
          If you reserved a static IP for the NexoralDNS machine:
        </p>
        <ol>
          <li>Access router admin panel</li>
          <li>Go to DHCP reservation settings</li>
          <li>Remove the reservation for your machine</li>
          <li>Save changes</li>
        </ol>

        <h3>Verify Complete Removal</h3>
        <p>
          Confirm all components are removed:
        </p>
        <CopyCodeBlock code="# Check for containers\nsudo docker ps -a | grep nexoral\n\n# Check for images\nsudo docker images | grep nexoral\n\n# Check for volumes\nsudo docker volume ls | grep nexoral\n\n# Check DNS configuration\ncat /etc/resolv.conf" />

        <p>
          All commands should return no results.
        </p>

        <h2>Troubleshooting Removal</h2>

        <h3>Removal Script Fails</h3>
        <p>
          <strong>Problem:</strong> Automated removal script encounters errors.
        </p>
        <p>
          <strong>Solution:</strong> Use manual removal process outlined above.
        </p>

        <h3>Containers Won&apos;t Stop</h3>
        <p>
          <strong>Force kill containers:</strong>
        </p>
        <CopyCodeBlock code="sudo docker kill $(sudo docker ps -q --filter 'name=nexoraldns')" />

        <h3>Volumes Won&apos;t Delete</h3>
        <p>
          <strong>Force remove volumes:</strong>
        </p>
        <CopyCodeBlock code="sudo docker volume rm $(sudo docker volume ls -q | grep nexoraldns) --force" />

        <h3>Permission Denied Errors</h3>
        <p>
          <strong>Ensure running with sudo:</strong>
        </p>
        <CopyCodeBlock code="sudo curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -s remove" />

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">Last Resort:</p>
          <p className="text-sm text-gray-300 my-0">
            If you cannot remove NexoralDNS through normal means, you can forcefully delete all Docker resources: <code>sudo docker system prune -af --volumes</code>. WARNING: This removes ALL Docker containers, images, and volumes on your system, not just NexoralDNS!
          </p>
        </div>

        <h2>Reinstalling After Removal</h2>

        <p>
          If you want to reinstall NexoralDNS after removal:
        </p>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -" />

        <p>
          This will perform a fresh installation. To restore from backup:
        </p>

        <CopyCodeBlock code="# After fresh installation, restore DNS records through dashboard\n# Go to: Settings → Import → Upload Backup File\n\n# Or manually restore configuration\nsudo cp -r ~/nexoraldns-backup/* /var/lib/nexoraldns/dns-config/\nsudo docker compose restart" />

        <h2>Alternatives to Complete Removal</h2>

        <p>
          Before removing NexoralDNS completely, consider these alternatives:
        </p>

        <h3>Stop Services Instead</h3>
        <p>
          If you want to temporarily disable NexoralDNS without losing data:
        </p>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop" />
        <p>
          See the <a href="/docs/commands/stop">stop command</a> documentation for details.
        </p>

        <h3>Reset to Default Configuration</h3>
        <p>
          To keep NexoralDNS but reset all settings:
        </p>
        <CopyCodeBlock code="# This preserves installation but resets data\nsudo docker compose down -v\nsudo docker compose up -d" />

        <h2>Feedback</h2>

        <p>
          If you&apos;re removing NexoralDNS, we&apos;d love to hear why:
        </p>

        <ul>
          <li>Open an issue on <a href="https://github.com/nexoral/NexoralDNS/issues">GitHub</a> with feedback</li>
          <li>Share your experience to help us improve</li>
          <li>Let us know what features you&apos;d like to see</li>
        </ul>

        <h2>Related Commands</h2>

        <ul>
          <li>
            <a href="/docs/commands/install">Install Command</a> - Reinstall NexoralDNS
          </li>
          <li>
            <a href="/docs/commands/stop">Stop Command</a> - Alternative to removal
          </li>
          <li>
            <a href="/docs/installation">Installation Guide</a> - Complete installation documentation
          </li>
          <li>
            <a href="/docs/troubleshooting">Troubleshooting</a> - Common issues and solutions
          </li>
        </ul>
      </div>
    </div>
  );
}
