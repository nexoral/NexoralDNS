import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function UpdateCommand() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Update Command</h1>

        <p className="text-xl text-gray-400">
          Update NexoralDNS to the latest version with a single command. This automated process handles version checking, downloading, and service restart.
        </p>

        <h2>Command</h2>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update" />

        <h2>What It Does</h2>

        <p>
          The update command brings your NexoralDNS installation up to date with the latest features, security patches, and bug fixes. It performs the following operations:
        </p>

        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 my-6">
          <p className="text-green-400 font-semibold mb-2">Update Process:</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Checks for NexoralDNS installation</li>
            <li>Queries GitHub for the latest release version</li>
            <li>Compares current version with latest version</li>
            <li>Creates backup of current configuration</li>
            <li>Gracefully stops all running services</li>
            <li>Pulls latest Docker images from registry</li>
            <li>Updates repository files and scripts</li>
            <li>Restarts services with new version</li>
            <li>Verifies successful update and service health</li>
            <li>Displays version information and changelog</li>
          </ul>
        </div>

        <h2>Version Checking</h2>

        <h3>Automatic Version Detection</h3>
        <p>
          The update command automatically detects your current version and compares it with the latest available release:
        </p>

        <CopyCodeBlock
          language="text"
          code={`Checking current version...
Current version: v1.2.3
Latest version:  v1.3.0

Update available! Proceeding with update...`}
        />

        <h3>Already Up to Date</h3>
        <p>
          If you&apos;re already running the latest version:
        </p>

        <CopyCodeBlock
          language="text"
          code={`Checking current version...
Current version: v1.3.0
Latest version:  v1.3.0

✓ You are already running the latest version!
No update needed.`}
        />

        <h3>Manual Version Check</h3>
        <p>
          To check your current version without updating:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS\ngit describe --tags" />

        <p>
          To check the latest available version:
        </p>
        <CopyCodeBlock code={`curl -s https://api.github.com/repos/nexoral/NexoralDNS/releases/latest | grep '"tag_name"'`} />

        <h2>Update Process Details</h2>

        <h3>Configuration Backup</h3>
        <p>
          Before updating, your configurations are automatically backed up:
        </p>

        <CopyCodeBlock
          language="text"
          code={`Creating backup of current configuration...
Backup saved to: /var/lib/nexoraldns/backups/config_2025-12-20_14-30-45.tar.gz
✓ Backup completed successfully`}
        />

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 my-6">
          <p className="text-blue-400 font-semibold mb-2">Backup Location:</p>
          <p className="text-sm text-gray-300 my-0">
            Configuration backups are stored in <code>/var/lib/nexoraldns/backups/</code>. These backups include all custom DNS records, block lists, user settings, and dashboard configurations. They do NOT include query logs or cache data.
          </p>
        </div>

        <h3>Service Downtime</h3>
        <p>
          During the update, services will be temporarily unavailable:
        </p>

        <ul>
          <li><strong>DNS Server:</strong> 30-60 seconds downtime</li>
          <li><strong>Web Dashboard:</strong> 30-60 seconds downtime</li>
          <li><strong>Total Update Time:</strong> 2-5 minutes depending on connection speed</li>
        </ul>

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">Network Impact:</p>
          <p className="text-sm text-gray-300 my-0">
            During the update, DNS resolution will be unavailable for devices using NexoralDNS. This may cause temporary internet connectivity issues on your network. Consider scheduling updates during low-usage periods.
          </p>
        </div>

        <h2>Expected Output</h2>

        <p>
          A successful update will display output similar to:
        </p>

        <CopyCodeBlock
          language="text"
          code={`NexoralDNS Update Process
========================

[✓] Current installation detected
[✓] Version check completed
    Current: v1.2.3
    Latest:  v1.3.0

[✓] Configuration backed up
[✓] Services stopped gracefully
[✓] Pulling latest images...

latest: Pulling from nexoral/dns-server
Digest: sha256:abc123...
Status: Downloaded newer image for nexoral/dns-server:latest

latest: Pulling from nexoral/dashboard
Digest: sha256:def456...
Status: Downloaded newer image for nexoral/dashboard:latest

[✓] Images updated successfully
[✓] Repository files updated
[✓] Starting services with new version...
[✓] Health check passed

Update Complete!
================

Previous version: v1.2.3
Current version:  v1.3.0

What's New in v1.3.0:
  • Improved DNS query performance
  • New dashboard analytics features
  • Security patches applied
  • Bug fixes for cache manager

Access dashboard at: http://localhost:4000`}
        />

        <h2>Update Frequency Recommendations</h2>

        <h3>Security Updates</h3>
        <p>
          Apply security updates immediately when notified. Security releases are tagged with <code>SECURITY</code> in release notes.
        </p>

        <h3>Feature Updates</h3>
        <p>
          Update monthly or when new features you need are released. Review the changelog before updating.
        </p>

        <h3>Patch Updates</h3>
        <p>
          Minor bug fixes and patches can be applied as needed, typically every 2-4 weeks.
        </p>

        <h2>Rollback Procedure</h2>

        <p>
          If an update causes issues, you can rollback to the previous version:
        </p>

        <h3>Option 1: Restore from Backup</h3>
        <CopyCodeBlock code="# Stop services\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop\n\n# Restore configuration\nsudo tar -xzf /var/lib/nexoraldns/backups/config_YYYY-MM-DD_HH-MM-SS.tar.gz -C /\n\n# Start services\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start" />

        <h3>Option 2: Checkout Previous Version</h3>
        <CopyCodeBlock code="# Navigate to installation directory\ncd /path/to/NexoralDNS\n\n# Stop services\nsudo docker compose down\n\n# Checkout previous version (replace with actual version)\ngit checkout v1.2.3\n\n# Pull images for that version\nsudo docker compose pull\n\n# Start services\nsudo docker compose up -d" />

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">Rollback Warning:</p>
          <p className="text-sm text-gray-300 my-0">
            Rolling back to an older version may cause compatibility issues if the database schema or configuration format changed. Always check release notes for breaking changes before rolling back.
          </p>
        </div>

        <h2>Pre-Update Checklist</h2>

        <p>
          Before updating, consider these steps:
        </p>

        <ol>
          <li>
            <strong>Read Release Notes:</strong> Review the changelog for breaking changes
          </li>
          <li>
            <strong>Check Disk Space:</strong> Ensure at least 2GB free space available
          </li>
          <li>
            <strong>Verify Backup:</strong> Confirm automatic backup completed successfully
          </li>
          <li>
            <strong>Schedule Downtime:</strong> Notify network users of brief service interruption
          </li>
          <li>
            <strong>Test Environment:</strong> If possible, test update on a staging system first
          </li>
        </ol>

        <h2>Troubleshooting</h2>

        <h3>Update Fails - Network Issues</h3>
        <p>
          <strong>Problem:</strong> Cannot download latest images due to network connectivity.
        </p>
        <p>
          <strong>Solution:</strong> Check internet connection and retry:
        </p>
        <CopyCodeBlock code="# Test connectivity to Docker Hub\ncurl -I https://hub.docker.com\n\n# Retry update\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update" />

        <h3>Update Fails - Insufficient Space</h3>
        <p>
          <strong>Problem:</strong> Not enough disk space to download new images.
        </p>
        <p>
          <strong>Solution:</strong> Clean up old Docker images and containers:
        </p>
        <CopyCodeBlock code="# Remove unused images and containers\nsudo docker system prune -a\n\n# Check free space\ndf -h\n\n# Retry update\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update" />

        <h3>Services Don&apos;t Start After Update</h3>
        <p>
          <strong>Check logs for errors:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose logs" />
        <p>
          <strong>Verify image integrity:</strong>
        </p>
        <CopyCodeBlock code="sudo docker images | grep nexoral" />
        <p>
          <strong>Force re-pull images:</strong>
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose pull\nsudo docker compose up -d" />

        <h3>Configuration Lost After Update</h3>
        <p>
          <strong>Restore from automatic backup:</strong>
        </p>
        <CopyCodeBlock code="# List available backups\nls -lh /var/lib/nexoraldns/backups/\n\n# Restore latest backup\nsudo tar -xzf /var/lib/nexoraldns/backups/config_LATEST.tar.gz -C /\n\n# Restart services\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start" />

        <h2>Update Notifications</h2>

        <h3>Dashboard Notification</h3>
        <p>
          When a new version is available, you&apos;ll see a notification in the web dashboard with:
        </p>
        <ul>
          <li>Current version number</li>
          <li>Latest available version</li>
          <li>Brief changelog highlights</li>
          <li>One-click update button</li>
        </ul>

        <h3>Enable Auto-Update Notifications</h3>
        <p>
          Configure automatic update notifications in the dashboard:
        </p>
        <p>
          Settings → System → Updates → Enable Update Notifications
        </p>

        <h2>Related Commands</h2>

        <ul>
          <li>
            <a href="/docs/commands/install">Install Command</a> - Initial installation
          </li>
          <li>
            <a href="/docs/commands/start">Start Command</a> - Start services after update
          </li>
          <li>
            <a href="/docs/commands/stop">Stop Command</a> - Stop services before manual update
          </li>
          <li>
            <a href="/docs/troubleshooting">Troubleshooting</a> - Common issues and solutions
          </li>
        </ul>
      </div>
    </div>
  );
}
