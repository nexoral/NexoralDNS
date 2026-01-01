import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function StartCommand() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Start Command</h1>

        <p className="text-xl text-gray-400">
          Start all NexoralDNS services that have been previously installed. Use this command to resume services after they&apos;ve been stopped.
        </p>

        <h2>Command</h2>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start" />

        <h2>What It Does</h2>

        <p>
          The start command reactivates all NexoralDNS services that are currently stopped. It performs the following operations:
        </p>

        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 my-6">
          <p className="text-green-400 font-semibold mb-2">Start Process:</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Verifies NexoralDNS is installed on the system</li>
            <li>Checks Docker and Docker Compose are available</li>
            <li>Navigates to the NexoralDNS installation directory</li>
            <li>Starts all Docker containers in detached mode</li>
            <li>Restores DNS configuration to use NexoralDNS</li>
            <li>Verifies all services are running properly</li>
            <li>Displays service status and access information</li>
          </ul>
        </div>

        <h2>When to Use</h2>

        <p>
          Use the start command in these scenarios:
        </p>

        <h3>After Stopping Services</h3>
        <p>
          If you previously ran the <a href="/docs/commands/stop">stop command</a> to halt services, use start to resume them.
        </p>

        <h3>After System Reboot</h3>
        <p>
          If your system rebooted and containers are not configured for auto-restart, use this command to bring services back online.
        </p>

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 my-6">
          <p className="text-blue-400 font-semibold mb-2">Auto-Start on Boot:</p>
          <p className="text-sm text-gray-300 my-0">
            By default, Docker containers are configured with <code>restart: unless-stopped</code> policy. This means they automatically start after system reboots unless explicitly stopped with the stop command.
          </p>
        </div>

        <h3>After Network Changes</h3>
        <p>
          If you&apos;ve made network configuration changes and need to restart DNS services.
        </p>

        <h3>Maintenance Recovery</h3>
        <p>
          After performing system maintenance or updates that required stopping services.
        </p>

        <h2>Expected Output</h2>

        <p>
          When services start successfully, you&apos;ll see output similar to:
        </p>

        <CopyCodeBlock
          language="text"
          code={`[✓] NexoralDNS installation found
[✓] Docker is running
[✓] Starting services...

Creating network "nexoraldns_default" (if not exists)
Starting nexoraldns-dns-server ... done
Starting nexoraldns-cache       ... done
Starting nexoraldns-dashboard   ... done

[✓] All services started successfully
[✓] DNS configuration restored

Services Status:
  DNS Server:     Running (Port 53)
  Cache Manager:  Running
  Web Dashboard:  Running (Port 4000)

Access dashboard at: http://localhost:4000`}
        />

        <h2>Verifying Services</h2>

        <h3>Check Container Status</h3>
        <p>
          Verify all containers are running:
        </p>
        <CopyCodeBlock code="sudo docker compose ps" />

        <p>
          All services should show status as <code>Up</code>:
        </p>

        <CopyCodeBlock
          language="text"
          code={`NAME                       STATUS    PORTS
nexoraldns-dns-server      Up        0.0.0.0:53->53/udp
nexoraldns-cache           Up
nexoraldns-dashboard       Up        0.0.0.0:4000->4000/tcp`}
        />

        <h3>Test DNS Resolution</h3>
        <p>
          Ensure DNS queries are being resolved:
        </p>
        <CopyCodeBlock code="dig @localhost google.com" />

        <h3>Access Web Dashboard</h3>
        <p>
          Open your browser and navigate to:
        </p>
        <CopyCodeBlock code="http://localhost:4000" />

        <h2>Alternative Start Methods</h2>

        <h3>Using Docker Compose Directly</h3>
        <p>
          If you prefer to use Docker Compose commands directly:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose up -d" />

        <h3>Start Specific Service</h3>
        <p>
          To start only a specific service:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose up -d dns-server" />

        <h2>Troubleshooting</h2>

        <h3>Services Fail to Start</h3>
        <p>
          <strong>Check Docker is running:</strong>
        </p>
        <CopyCodeBlock code="sudo systemctl status docker" />
        <p>
          If Docker is not running:
        </p>
        <CopyCodeBlock code="sudo systemctl start docker" />

        <h3>Port Conflicts</h3>
        <p>
          <strong>Problem:</strong> Port 53 or 4000 is already in use.
        </p>
        <p>
          <strong>Check what&apos;s using the port:</strong>
        </p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :53\nsudo netstat -tulpn | grep :4000" />
        <p>
          <strong>Stop conflicting services:</strong>
        </p>
        <CopyCodeBlock code="# For systemd-resolved on port 53\nsudo systemctl stop systemd-resolved" />

        <h3>Containers Start But Exit Immediately</h3>
        <p>
          <strong>View container logs:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose logs" />
        <p>
          Look for error messages that indicate configuration issues or missing dependencies.
        </p>

        <h3>DNS Not Working After Start</h3>
        <p>
          <strong>Verify DNS configuration:</strong>
        </p>
        <CopyCodeBlock code="cat /etc/resolv.conf" />
        <p>
          Should contain:
        </p>
        <CopyCodeBlock
          language="text"
          code="nameserver 127.0.0.1"
        />

        <h3>Cannot Access Dashboard</h3>
        <p>
          <strong>Check dashboard container logs:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose logs dashboard" />
        <p>
          <strong>Verify port binding:</strong>
        </p>
        <CopyCodeBlock code="sudo docker port nexoraldns-dashboard" />

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">Still Having Issues?</p>
          <p className="text-sm text-gray-300 my-0">
            If services fail to start after troubleshooting, try stopping all services completely and starting fresh. See the <a href="/docs/commands/stop">stop command</a> documentation, then attempt to start again. If problems persist, check the <a href="/docs/troubleshooting">troubleshooting guide</a>.
          </p>
        </div>

        <h2>Related Commands</h2>

        <ul>
          <li>
            <a href="/docs/commands/stop">Stop Command</a> - Stop all NexoralDNS services
          </li>
          <li>
            <a href="/docs/commands/update">Update Command</a> - Update to the latest version
          </li>
          <li>
            <a href="/docs/commands/install">Install Command</a> - Initial installation
          </li>
          <li>
            <a href="/docs/troubleshooting">Troubleshooting</a> - Common issues and solutions
          </li>
        </ul>
      </div>
    </div>
  );
}
