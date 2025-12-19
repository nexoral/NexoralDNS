import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function InstallCommand() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Install Command</h1>

        <p className="text-xl text-gray-400">
          Install NexoralDNS with a single command. This automated installer handles all dependencies and configurations.
        </p>

        <h2>Command</h2>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -" />

        <h2>What It Does</h2>

        <p>
          The installation script automates the entire setup process for NexoralDNS. It detects your system configuration and performs the following actions:
        </p>

        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 my-6">
          <p className="text-green-400 font-semibold mb-2">Installation Steps:</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Verifies system compatibility (Linux Debian/Ubuntu)</li>
            <li>Checks for and installs Docker if not present</li>
            <li>Checks for and installs Docker Compose if not present</li>
            <li>Downloads the NexoralDNS repository</li>
            <li>Pulls the latest Docker images for all services</li>
            <li>Configures system DNS settings to use NexoralDNS</li>
            <li>Starts all containers (DNS server, web dashboard, cache manager)</li>
            <li>Verifies successful installation</li>
            <li>Displays access information for the web interface</li>
          </ul>
        </div>

        <h2>System Requirements</h2>

        <p>Before running the installation command, ensure your system meets these requirements:</p>

        <table>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Operating System</td>
              <td>Linux (Debian/Ubuntu based distributions recommended)</td>
            </tr>
            <tr>
              <td>Privileges</td>
              <td>Root or sudo access required</td>
            </tr>
            <tr>
              <td>RAM</td>
              <td>Minimum 1GB, 2GB+ recommended</td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>At least 4GB free space</td>
            </tr>
            <tr>
              <td>Network</td>
              <td>LAN connectivity (NOT for cloud/public servers)</td>
            </tr>
            <tr>
              <td>Ports</td>
              <td>53 (DNS) and 4000 (Dashboard) must be available</td>
            </tr>
          </tbody>
        </table>

        <h2>Expected Output</h2>

        <p>
          During installation, you&apos;ll see progress indicators for each step. A successful installation will display:
        </p>

        <CopyCodeBlock
          language="text"
          code={`[✓] System compatibility check passed
[✓] Docker installed successfully
[✓] Docker Compose installed successfully
[✓] NexoralDNS repository cloned
[✓] Docker images downloaded
[✓] Services started successfully
[✓] DNS configuration updated

Installation complete!

Access the web dashboard at: http://localhost:4000
Default credentials:
  Username: admin
  Password: admin

IMPORTANT: Change the default password after first login!`}
        />

        <h2>Post-Installation Steps</h2>

        <ol>
          <li>
            <strong>Access the Dashboard:</strong> Navigate to <code>http://localhost:4000</code> in your browser
          </li>
          <li>
            <strong>Login:</strong> Use username <code>admin</code> and password <code>admin</code>
          </li>
          <li>
            <strong>Change Password:</strong> Immediately update credentials in Settings
          </li>
          <li>
            <strong>Configure Router:</strong> Set your router&apos;s DNS to your machine&apos;s IP address
          </li>
          <li>
            <strong>Reserve Static IP:</strong> Configure your router to assign a static IP to the NexoralDNS machine
          </li>
        </ol>

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">Security Notice:</p>
          <p className="text-sm text-gray-300 my-0">
            The default credentials are widely known. For security, you MUST change the password immediately after installation. Go to Settings → Change Password in the web dashboard.
          </p>
        </div>

        <h2>Troubleshooting</h2>

        <h3>Installation Fails with Permission Denied</h3>
        <p>
          <strong>Solution:</strong> Run the command with sudo or as root user:
        </p>
        <CopyCodeBlock code="sudo curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -" />

        <h3>Port 53 Already in Use</h3>
        <p>
          <strong>Problem:</strong> Another DNS service is using port 53 (e.g., systemd-resolved).
        </p>
        <p>
          <strong>Solution:</strong> Disable the conflicting service:
        </p>
        <CopyCodeBlock code="sudo systemctl disable systemd-resolved\nsudo systemctl stop systemd-resolved" />

        <h3>Port 4000 Already in Use</h3>
        <p>
          <strong>Problem:</strong> Another application is using port 4000.
        </p>
        <p>
          <strong>Solution:</strong> Either stop the conflicting service or modify the port in <code>docker-compose.yml</code> before installation.
        </p>

        <h3>Docker Installation Fails</h3>
        <p>
          <strong>Solution:</strong> Manually install Docker and Docker Compose, then run the installation again:
        </p>
        <CopyCodeBlock code="# Install Docker\ncurl -fsSL https://get.docker.com | sh\n\n# Install Docker Compose\nsudo apt-get install docker-compose-plugin\n\n# Run NexoralDNS installer again\ncurl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -" />

        <h3>Cannot Access Web Dashboard</h3>
        <p>
          <strong>Check services are running:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose ps" />
        <p>
          <strong>View logs for errors:</strong>
        </p>
        <CopyCodeBlock code="sudo docker compose logs -f" />

        <h3>DNS Resolution Not Working</h3>
        <p>
          <strong>Verify DNS server is listening:</strong>
        </p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :53" />
        <p>
          <strong>Test DNS query:</strong>
        </p>
        <CopyCodeBlock code="dig @localhost google.com" />

        <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4 my-6">
          <p className="text-blue-400 font-semibold mb-2">Need More Help?</p>
          <ul className="text-sm text-gray-300 space-y-1 my-0">
            <li>Check the <a href="/docs/troubleshooting">Troubleshooting Guide</a> for more solutions</li>
            <li>Review <a href="https://github.com/nexoral/NexoralDNS/issues">GitHub Issues</a> for known problems</li>
            <li>Open a new issue if you encounter a unique problem</li>
            <li>Premium users: Contact support for priority assistance</li>
          </ul>
        </div>

        <h2>Next Steps</h2>

        <ul>
          <li>
            <a href="/docs/commands/start">Start Command</a> - Learn how to start services
          </li>
          <li>
            <a href="/docs/commands/stop">Stop Command</a> - Learn how to stop services
          </li>
          <li>
            <a href="/docs/features">Explore Features</a> - Discover what NexoralDNS can do
          </li>
          <li>
            <a href="/docs/api">API Documentation</a> - Automate with the REST API
          </li>
        </ul>
      </div>
    </div>
  );
}
