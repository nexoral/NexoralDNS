import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function StopCommand() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Stop Command</h1>

        <p className="text-xl text-gray-400">
          Stop all NexoralDNS services without removing any data or configurations. Services can be restarted later with the start command.
        </p>

        <h2>Command</h2>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop" />

        <h2>What It Does</h2>

        <p>
          The stop command gracefully shuts down all NexoralDNS services while preserving all data, configurations, and settings. It performs the following operations:
        </p>

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 my-6">
          <p className="text-blue-400 font-semibold mb-2">Stop Process:</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Verifies NexoralDNS installation exists</li>
            <li>Sends graceful shutdown signals to all containers</li>
            <li>Stops the DNS server (port 53 becomes available)</li>
            <li>Stops the cache manager</li>
            <li>Stops the web dashboard (port 4000 becomes available)</li>
            <li>Restores original system DNS configuration</li>
            <li>Confirms all containers are stopped</li>
            <li>Leaves all data volumes intact</li>
          </ul>
        </div>

        <h2>When to Use</h2>

        <p>
          Use the stop command in these scenarios:
        </p>

        <h3>System Maintenance</h3>
        <p>
          When performing system updates, hardware maintenance, or other administrative tasks that require DNS services to be temporarily offline.
        </p>

        <h3>Troubleshooting</h3>
        <p>
          When diagnosing network issues or testing alternative DNS configurations.
        </p>

        <h3>Resource Management</h3>
        <p>
          To free up system resources (RAM, CPU) when NexoralDNS is not needed temporarily.
        </p>

        <h3>Port Conflicts</h3>
        <p>
          When you need to temporarily use port 53 or 4000 for another service.
        </p>

        <h3>Before Updates</h3>
        <p>
          Although the <a href="/docs/commands/update">update command</a> handles this automatically, you may want to manually stop services before performing manual updates.
        </p>

        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 my-6">
          <p className="text-green-400 font-semibold mb-2">Data Preservation:</p>
          <p className="text-sm text-gray-300 my-0">
            The stop command does NOT delete any data. All configurations, DNS records, cache data, statistics, and settings are preserved. Use the <a href="/docs/commands/start">start command</a> to resume services with all your data intact.
          </p>
        </div>

        <h2>Expected Output</h2>

        <p>
          When services stop successfully, you&apos;ll see output similar to:
        </p>

        <CopyCodeBlock
          language="text"
          code={`[✓] NexoralDNS installation found
[✓] Stopping services...

Stopping nexoraldns-dashboard   ... done
Stopping nexoraldns-cache       ... done
Stopping nexoraldns-dns-server  ... done

[✓] All services stopped successfully
[✓] Original DNS configuration restored

Services Status:
  DNS Server:     Stopped
  Cache Manager:  Stopped
  Web Dashboard:  Stopped

Note: All data and configurations preserved.
Run start command to resume services.`}
        />

        <h2>What Happens to Services</h2>

        <h3>DNS Server</h3>
        <ul>
          <li>DNS resolution on port 53 stops</li>
          <li>All custom DNS records and configurations remain saved</li>
          <li>Block lists and filtering rules are preserved</li>
          <li>Query logs are retained in the database</li>
        </ul>

        <h3>Cache Manager</h3>
        <ul>
          <li>Cache service stops processing requests</li>
          <li>In-memory cache is cleared (will rebuild on restart)</li>
          <li>Persistent cache data remains in volumes</li>
          <li>Cache statistics and history are preserved</li>
        </ul>

        <h3>Web Dashboard</h3>
        <ul>
          <li>Web interface becomes inaccessible at port 4000</li>
          <li>User accounts and settings are preserved</li>
          <li>Session data may expire but can be re-authenticated</li>
          <li>All dashboard configurations remain intact</li>
        </ul>

        <h3>Network Configuration</h3>
        <ul>
          <li>System DNS reverts to previous configuration</li>
          <li>Your network continues working with original DNS servers</li>
          <li>Docker networks created by NexoralDNS remain (inactive)</li>
        </ul>

        <h2>Verifying Services Stopped</h2>

        <h3>Check Container Status</h3>
        <p>
          Verify all containers are stopped:
        </p>
        <CopyCodeBlock code="sudo docker compose ps -a" />

        <p>
          All services should show status as <code>Exited</code>:
        </p>

        <CopyCodeBlock
          language="text"
          code={`NAME                       STATUS
nexoraldns-dns-server      Exited (0)
nexoraldns-cache           Exited (0)
nexoraldns-dashboard       Exited (0)`}
        />

        <h3>Check Port Availability</h3>
        <p>
          Verify ports 53 and 4000 are no longer in use:
        </p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :53\nsudo netstat -tulpn | grep :4000" />

        <p>
          These commands should return no output if ports are free.
        </p>

        <h3>Verify Data Preservation</h3>
        <p>
          Check that data volumes still exist:
        </p>
        <CopyCodeBlock code="sudo docker volume ls | grep nexoraldns" />

        <h2>Alternative Stop Methods</h2>

        <h3>Using Docker Compose Directly</h3>
        <p>
          If you prefer to use Docker Compose commands directly:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose stop" />

        <h3>Stop Specific Service</h3>
        <p>
          To stop only a specific service while keeping others running:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose stop dashboard" />

        <h3>Force Stop (Not Recommended)</h3>
        <p>
          If services don&apos;t respond to graceful shutdown:
        </p>
        <CopyCodeBlock code="sudo docker compose kill" />

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">Force Stop Warning:</p>
          <p className="text-sm text-gray-300 my-0">
            Using <code>docker compose kill</code> forcefully terminates containers without graceful shutdown. This may result in data corruption or incomplete transactions. Only use this if normal stop command fails.
          </p>
        </div>

        <h2>Resuming Services</h2>

        <p>
          To restart NexoralDNS services after stopping:
        </p>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start" />

        <p>
          All your data, configurations, and settings will be exactly as you left them.
        </p>

        <h2>Troubleshooting</h2>

        <h3>Services Won&apos;t Stop</h3>
        <p>
          <strong>Check for active connections:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose logs" />
        <p>
          Wait a few moments for graceful shutdown, then retry. If still hanging, use force stop.
        </p>

        <h3>DNS Not Restored</h3>
        <p>
          <strong>Manually restore DNS:</strong>
        </p>
        <CopyCodeBlock code="# Check current DNS\ncat /etc/resolv.conf\n\n# Edit if needed\nsudo nano /etc/resolv.conf\n\n# Add your preferred DNS (e.g., Google)\nnameserver 8.8.8.8\nnameserver 8.8.4.4" />

        <h3>Containers Restart Automatically</h3>
        <p>
          <strong>Problem:</strong> Containers restart after stopping due to restart policy.
        </p>
        <p>
          <strong>Solution:</strong> Use down instead of stop to remove containers:
        </p>
        <CopyCodeBlock code="cd /path/to/NexoralDNS/Scripts\nsudo docker compose down" />

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">Down vs Stop:</p>
          <p className="text-sm text-gray-300 my-0">
            <code>docker compose down</code> stops AND removes containers (but preserves volumes). Use <code>stop</code> to keep containers for faster restarts. Use <code>down</code> to completely remove containers while preserving data.
          </p>
        </div>

        <h2>Related Commands</h2>

        <ul>
          <li>
            <a href="/docs/commands/start">Start Command</a> - Resume NexoralDNS services
          </li>
          <li>
            <a href="/docs/commands/remove">Remove Command</a> - Completely uninstall NexoralDNS
          </li>
          <li>
            <a href="/docs/commands/update">Update Command</a> - Update to latest version
          </li>
          <li>
            <a href="/docs/troubleshooting">Troubleshooting</a> - Common issues and solutions
          </li>
        </ul>
      </div>
    </div>
  );
}
