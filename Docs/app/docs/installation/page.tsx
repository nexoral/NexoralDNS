import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function Installation() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Installation Guide</h1>

        <p className="text-xl text-gray-400">
          Get NexoralDNS up and running in minutes with our automated installation script.
        </p>

        <h2>Quick Installation</h2>

        <p>
          The easiest way to install NexoralDNS is using our one-command installer:
        </p>

        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -" />

        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 my-6">
          <p className="text-green-400 font-semibold mb-2">✅ What the installer does:</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>Automatically installs Docker and Docker Compose if not present</li>
            <li>Downloads the latest NexoralDNS images</li>
            <li>Configures system DNS settings</li>
            <li>Starts all NexoralDNS services</li>
            <li>Sets up the web dashboard on port 4000</li>
          </ul>
        </div>

        <h2>System Requirements</h2>

        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Requirement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Operating System</td>
              <td>Linux Debian/Ubuntu (Recommended)</td>
            </tr>
            <tr>
              <td>Memory</td>
              <td>Minimum 1GB RAM (2GB+ recommended)</td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>Minimum 4GB free space</td>
            </tr>
            <tr>
              <td>Network</td>
              <td>LAN connectivity (NOT cloud/public internet)</td>
            </tr>
            <tr>
              <td>Privileges</td>
              <td>Administrator/root access for installation</td>
            </tr>
            <tr>
              <td>Ports</td>
              <td>53 (DNS), 4000 (Web Dashboard)</td>
            </tr>
          </tbody>
        </table>

        <h2>Manual Installation</h2>

        <p>
          If you prefer manual installation or want to contribute to development:
        </p>

        <h3>Step 1: Clone the Repository</h3>
        <CopyCodeBlock code="git clone https://github.com/nexoral/NexoralDNS.git\ncd NexoralDNS" />

        <h3>Step 2: Start with Docker Compose</h3>
        <CopyCodeBlock code="cd Scripts\nsudo docker compose up -d" />

        <h3>Step 3: Verify Installation</h3>
        <CopyCodeBlock code="sudo docker compose ps" />

        <p>You should see all services running with status &quot;Up&quot;.</p>

        <h2>Post-Installation Setup</h2>

        <h3>1. Access the Web Interface</h3>
        <p>Open your browser and navigate to:</p>
        <CopyCodeBlock code="http://localhost:4000" />

        <h3>2. Initial Login</h3>
        <p>Use the default credentials:</p>
        <ul>
          <li><strong>Username:</strong> admin</li>
          <li><strong>Password:</strong> admin</li>
        </ul>

        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
          <p className="text-yellow-400 font-semibold mb-2">⚠️ Security Warning:</p>
          <p className="text-sm text-gray-300">
            Change the default password immediately after first login! Go to Settings → Change Password.
          </p>
        </div>

        <h3>3. Activate the Service</h3>
        <p>
          Enter your activation key from the cloud platform. If you don&apos;t have one, the free tier will be activated automatically.
        </p>

        <h3>4. Configure Your Router</h3>
        <p>
          To use NexoralDNS for your entire network:
        </p>
        <ol>
          <li>Find your machine&apos;s local IP address (e.g., 192.168.1.100)</li>
          <li>Access your router&apos;s admin panel</li>
          <li>Navigate to DNS settings (usually under LAN or DHCP settings)</li>
          <li>Set Primary DNS to your machine&apos;s IP address</li>
          <li>Save and restart your router</li>
        </ol>

        <h3>5. Reserve a Static IP</h3>
        <p>
          In your router settings, reserve the IP address for your NexoralDNS machine to prevent DNS interruption if the IP changes.
        </p>

        <h2>Service Management Commands</h2>

        <h3>Start Services</h3>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start" />

        <h3>Stop Services</h3>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop" />

        <h3>Update Services</h3>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update" />

        <h3>Complete Removal</h3>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s remove" />

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">🗑️ Warning:</p>
          <p className="text-sm text-gray-300">
            The remove command will completely delete all configurations, services, and data. This action is irreversible!
          </p>
        </div>

        <h2>Verification</h2>

        <h3>Test DNS Resolution</h3>
        <p>From any device on your network, test DNS resolution:</p>
        <CopyCodeBlock code="# On Linux/Mac\ndig @192.168.1.100 google.com\n\n# On Windows\nnslookup google.com 192.168.1.100" />

        <h3>Check Service Status</h3>
        <CopyCodeBlock code="sudo docker compose ps" />

        <h3>View Logs</h3>
        <CopyCodeBlock code="# All services\nsudo docker compose logs -f\n\n# Specific service\nsudo docker compose logs -f dns-server" />

        <h2>Next Steps</h2>

        <ul>
          <li>
            <a href="/docs/features">Explore Features</a> - Learn about custom domains, blocking rules, and more
          </li>
          <li>
            <a href="/docs/architecture">Understanding Architecture</a> - Deep dive into how NexoralDNS works
          </li>
          <li>
            <a href="/docs/api">API Reference</a> - Automate with the REST API
          </li>
          <li>
            <a href="/docs/troubleshooting">Troubleshooting</a> - Common issues and solutions
          </li>
        </ul>

        <h2>Getting Help</h2>

        <p>
          If you encounter any issues during installation:
        </p>

        <ul>
          <li>Check the <a href="/docs/troubleshooting">Troubleshooting Guide</a></li>
          <li>Open an issue on <a href="https://github.com/nexoral/NexoralDNS/issues">GitHub</a></li>
          <li>Review existing issues for similar problems</li>
          <li>Premium users: Contact support for priority assistance</li>
        </ul>
      </div>
    </div>
  );
}
