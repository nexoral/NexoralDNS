import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function Troubleshooting() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
        <h1>Troubleshooting Guide</h1>

        <p className="text-xl text-gray-400">
          Common issues and solutions for NexoralDNS installation, configuration, and operation.
        </p>

        <h2>Quick Diagnostics</h2>

        <p>Before diving into specific issues, run these diagnostic commands:</p>

        <h3>Check Service Status</h3>
        <CopyCodeBlock code="sudo docker compose ps" />

        <h3>View All Logs</h3>
        <CopyCodeBlock code="sudo docker compose logs -f" />

        <h3>View Specific Service Logs</h3>
        <CopyCodeBlock code="sudo docker compose logs -f dns-server" />

        <h3>Check Version</h3>
        <CopyCodeBlock code="cat VERSION" />

        <h2>Installation Issues</h2>

        <h3>Problem: Installation Script Fails</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>Installation script exits with error</li>
          <li>&quot;Permission denied&quot; messages</li>
          <li>Docker-related errors</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Ensure you have sudo privileges:</strong></p>
        <CopyCodeBlock code="sudo -v" />

        <p><strong>2. Check if Docker is installed:</strong></p>
        <CopyCodeBlock code="docker --version" />

        <p><strong>3. Manually install Docker if needed:</strong></p>
        <CopyCodeBlock
          code={`# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin`}
        />

        <p><strong>4. Re-run the installation:</strong></p>
        <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -" />

        <h3>Problem: Port Conflicts</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>&quot;Port 53 already in use&quot;</li>
          <li>&quot;Port 4000 already in use&quot;</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Check what&apos;s using port 53:</strong></p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :53" />

        <p><strong>2. Common culprits and how to disable them:</strong></p>

        <p>systemd-resolved (Ubuntu/Debian):</p>
        <CopyCodeBlock
          code={`# Disable systemd-resolved
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved

# Remove symlink
sudo rm /etc/resolv.conf

# Create new resolv.conf
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf`}
        />

        <p>dnsmasq:</p>
        <CopyCodeBlock
          code={`sudo systemctl disable dnsmasq
sudo systemctl stop dnsmasq`}
        />

        <p><strong>3. Check port 4000:</strong></p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :4000" />

        <h2>DNS Resolution Issues</h2>

        <h3>Problem: DNS Not Working After Installation</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>Websites not loading</li>
          <li>DNS queries timing out</li>
          <li>Custom domains not resolving</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Verify NexoralDNS is running:</strong></p>
        <CopyCodeBlock code="sudo docker compose ps" />

        <p>All services should show status &quot;Up&quot;.</p>

        <p><strong>2. Test DNS resolution directly:</strong></p>
        <CopyCodeBlock
          code={`# On Linux/Mac
dig @localhost google.com

# On Windows
nslookup google.com localhost`}
        />

        <p><strong>3. Check if port 53 is listening:</strong></p>
        <CopyCodeBlock code="sudo netstat -tulpn | grep :53" />

        <p><strong>4. Verify router DNS settings:</strong></p>
        <ul>
          <li>Log into your router&apos;s admin panel</li>
          <li>Navigate to DHCP/DNS settings</li>
          <li>Ensure Primary DNS is set to your NexoralDNS machine&apos;s IP</li>
          <li>Restart your router if settings were changed</li>
        </ul>

        <p><strong>5. Check firewall:</strong></p>
        <CopyCodeBlock
          code={`# Allow DNS traffic
sudo ufw allow 53/udp
sudo ufw allow 53/tcp

# Allow web dashboard
sudo ufw allow 4000/tcp`}
        />

        <h3>Problem: Custom Domains Not Resolving</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>External domains work, but custom domains return NXDOMAIN</li>
          <li>Custom domains work from server but not from other devices</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Verify the domain exists in the database:</strong></p>
        <ul>
          <li>Open dashboard at <code>http://localhost:4000</code></li>
          <li>Navigate to DNS Records</li>
          <li>Confirm your custom domain is listed and enabled</li>
        </ul>

        <p><strong>2. Clear cache:</strong></p>
        <CopyCodeBlock
          code={`# Redis cache clear
docker exec -it nexoraldns-redis-1 redis-cli FLUSHDB`}
        />

        <p><strong>3. Check service status:</strong></p>
        <ul>
          <li>In dashboard, verify service is &quot;Active&quot;</li>
          <li>Navigate to Settings → Service Status</li>
        </ul>

        <p><strong>4. Test from the server:</strong></p>
        <CopyCodeBlock code="dig @localhost myapp.local" />

        <p><strong>5. Test from another device:</strong></p>
        <CopyCodeBlock code="dig @192.168.1.100 myapp.local" />
        <p className="text-sm text-gray-500">(Replace 192.168.1.100 with your server&apos;s IP)</p>

        <h2>Web Dashboard Issues</h2>

        <h3>Problem: Cannot Access Web Dashboard</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>&quot;Connection refused&quot; when accessing localhost:4000</li>
          <li>Dashboard not loading</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Check if web service is running:</strong></p>
        <CopyCodeBlock code="sudo docker compose ps | grep web" />

        <p><strong>2. Restart the web service:</strong></p>
        <CopyCodeBlock code="sudo docker compose restart web" />

        <p><strong>3. Check logs for errors:</strong></p>
        <CopyCodeBlock code="sudo docker compose logs web" />

        <p><strong>4. Verify port 4000 is accessible:</strong></p>
        <CopyCodeBlock code="curl http://localhost:4000" />

        <p><strong>5. Check from another device (replace with your server IP):</strong></p>
        <CopyCodeBlock code="curl http://192.168.1.100:4000" />

        <h3>Problem: Login Issues</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>&quot;Invalid credentials&quot; error</li>
          <li>Forgot password</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Verify you&apos;re using default credentials (first login):</strong></p>
        <ul>
          <li>Username: <code>admin</code></li>
          <li>Password: <code>admin</code></li>
        </ul>

        <p><strong>2. Reset admin password (if forgotten):</strong></p>
        <CopyCodeBlock
          code={`# Access MongoDB container
docker exec -it nexoraldns-mongodb-1 mongosh

# Use the database
use nexoraldns

# Reset password (hash for 'admin')
db.users.updateOne(
  { username: "admin" },
  { $set: { password: "$2b$10$abcdefghijklmnopqrstuvwxyz" } }
)

exit`}
        />

        <h2>Performance Issues</h2>

        <h3>Problem: Slow DNS Resolution</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>DNS queries taking longer than expected</li>
          <li>Websites loading slowly</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Check Redis cache status:</strong></p>
        <CopyCodeBlock
          code={`docker exec -it nexoraldns-redis-1 redis-cli INFO stats`}
        />

        <p><strong>2. Verify cache hit rate in dashboard:</strong></p>
        <ul>
          <li>Navigate to Analytics → Performance</li>
          <li>Cache hit rate should be &gt;80%</li>
        </ul>

        <p><strong>3. Check system resources:</strong></p>
        <CopyCodeBlock code="docker stats" />

        <p><strong>4. Restart services to clear issues:</strong></p>
        <CopyCodeBlock code="sudo docker compose restart" />

        <p><strong>5. Check upstream DNS connectivity:</strong></p>
        <CopyCodeBlock code="dig @8.8.8.8 google.com" />

        <h2>Update Issues</h2>

        <h3>Problem: Update Fails</h3>

        <h4>Symptoms:</h4>
        <ul>
          <li>Update command fails</li>
          <li>Cannot pull new images</li>
          <li>Network errors during update</li>
        </ul>

        <h4>Solutions:</h4>

        <p><strong>1. Check internet connectivity:</strong></p>
        <CopyCodeBlock code="ping -c 4 8.8.8.8" />

        <p><strong>2. If update fails, remove and reinstall:</strong></p>
        <CopyCodeBlock
          code={`# Remove existing installation
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -s remove

# Fresh installation
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -`}
        />

        <p><strong>3. If network requests are blocked, restore system DNS:</strong></p>
        <CopyCodeBlock
          code={`sudo systemctl enable systemd-resolved
sudo systemctl restart systemd-resolved`}
        />

        <p><strong>4. Manual resolv.conf fix:</strong></p>
        <CopyCodeBlock
          code={`sudo nano /etc/resolv.conf
# Set or ensure the file contains:
nameserver 127.0.0.53`}
        />

        <h2>Database Issues</h2>

        <h3>Problem: MongoDB Connection Errors</h3>

        <h4>Solutions:</h4>

        <p><strong>1. Check MongoDB is running:</strong></p>
        <CopyCodeBlock code="sudo docker compose ps | grep mongo" />

        <p><strong>2. View MongoDB logs:</strong></p>
        <CopyCodeBlock code="sudo docker compose logs mongodb" />

        <p><strong>3. Restart MongoDB:</strong></p>
        <CopyCodeBlock code="sudo docker compose restart mongodb" />

        <h3>Problem: Redis Connection Errors</h3>

        <h4>Solutions:</h4>

        <p><strong>1. Check Redis is running:</strong></p>
        <CopyCodeBlock code="sudo docker compose ps | grep redis" />

        <p><strong>2. Test Redis connection:</strong></p>
        <CopyCodeBlock code="docker exec -it nexoraldns-redis-1 redis-cli PING" />
        <p className="text-sm text-gray-500">Should return: PONG</p>

        <p><strong>3. Restart Redis:</strong></p>
        <CopyCodeBlock code="sudo docker compose restart redis" />

        <h2>Complete Uninstallation</h2>

        <p>If you need to completely remove NexoralDNS from your system:</p>

        <CopyCodeBlock
          code={`curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -s remove`}
        />

        <p>This will:</p>
        <ul>
          <li>Stop all NexoralDNS services</li>
          <li>Remove Docker containers and images</li>
          <li>Delete all configuration files and data</li>
          <li>Clean up the installation directory</li>
        </ul>

        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 my-6">
          <p className="text-red-400 font-semibold mb-2">⚠️ Warning</p>
          <p className="text-sm text-gray-300 mb-0">
            This action is irreversible and will delete all your custom DNS configurations!
          </p>
        </div>

        <h2>Still Need Help?</h2>

        <p>If your issue isn&apos;t covered here:</p>

        <ol>
          <li><strong>Check GitHub Issues:</strong> Search for similar problems at <a href="https://github.com/nexoral/NexoralDNS/issues">github.com/nexoral/NexoralDNS/issues</a></li>
          <li><strong>Open a New Issue:</strong> Provide detailed information about your problem</li>
          <li><strong>Include Logs:</strong> Always include relevant log output</li>
          <li><strong>System Information:</strong> Include OS version, Docker version, and NexoralDNS version</li>
          <li><strong>Premium Support:</strong> Premium users can contact priority support for faster assistance</li>
        </ol>

        <h2>Useful Commands Reference</h2>

        <table>
          <thead>
            <tr>
              <th>Command</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>docker compose ps</code></td>
              <td>Check service status</td>
            </tr>
            <tr>
              <td><code>docker compose logs -f</code></td>
              <td>View all logs</td>
            </tr>
            <tr>
              <td><code>docker compose restart</code></td>
              <td>Restart all services</td>
            </tr>
            <tr>
              <td><code>docker compose down</code></td>
              <td>Stop all services</td>
            </tr>
            <tr>
              <td><code>docker compose up -d</code></td>
              <td>Start all services</td>
            </tr>
            <tr>
              <td><code>docker stats</code></td>
              <td>Monitor resource usage</td>
            </tr>
            <tr>
              <td><code>netstat -tulpn</code></td>
              <td>Check port usage</td>
            </tr>
            <tr>
              <td><code>dig @localhost domain.com</code></td>
              <td>Test DNS resolution</td>
            </tr>
          </tbody>
        </table>

        <h2>Common Error Messages</h2>

        <table>
          <thead>
            <tr>
              <th>Error</th>
              <th>Cause</th>
              <th>Solution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>&quot;Port already in use&quot;</td>
              <td>Another service using port 53 or 4000</td>
              <td>See <a href="#problem-port-conflicts">Port Conflicts</a> section</td>
            </tr>
            <tr>
              <td>&quot;Connection refused&quot;</td>
              <td>Service not running</td>
              <td>Check service status and restart</td>
            </tr>
            <tr>
              <td>&quot;NXDOMAIN&quot;</td>
              <td>Domain not found or blocked</td>
              <td>Check domain exists and service is active</td>
            </tr>
            <tr>
              <td>&quot;Permission denied&quot;</td>
              <td>Insufficient privileges</td>
              <td>Use sudo or check file permissions</td>
            </tr>
            <tr>
              <td>&quot;Network unreachable&quot;</td>
              <td>No internet connection</td>
              <td>Check network connectivity</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
