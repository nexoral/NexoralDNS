import CopyCodeBlock from "@/components/CopyCodeBlock";
import { FadeIn } from "@/components/MotionWrapper";

export default function Security() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>Security Policy</h1>

          <p className="text-xl text-gray-400">
            At NexoralDNS, we take security seriously. As DNS infrastructure software, we understand
            the critical role security plays in protecting your network.
          </p>

          <h2>Supported Versions</h2>

          <p>
            We provide security updates for the following versions:
          </p>

          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Supported</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Latest</td>
                <td>✅ Yes</td>
                <td>Always recommended</td>
              </tr>
              <tr>
                <td>1.x.x</td>
                <td>✅ Yes</td>
                <td>Current stable branch</td>
              </tr>
              <tr>
                <td>&lt; 1.0</td>
                <td>❌ No</td>
                <td>Please upgrade</td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>Recommendation:</strong> Always use the latest stable version to ensure you have the latest security patches.
          </p>

          <CopyCodeBlock code="cat VERSION" />

          <h2>Reporting a Vulnerability</h2>

          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-6 my-6">
            <p className="text-red-400 font-semibold mb-2">⚠️ IMPORTANT</p>
            <p className="text-gray-300 mb-0">
              <strong>PLEASE DO NOT REPORT SECURITY VULNERABILITIES THROUGH PUBLIC GITHUB ISSUES</strong>
              <br /><br />
              Public disclosure of security vulnerabilities can put all users at risk. We kindly request that you follow responsible disclosure practices.
            </p>
          </div>

          <h3>How to Report</h3>

          <h4>1. Primary Method: Email</h4>
          <p>Send a detailed report to our security team:</p>
          <ul>
            <li><strong>Email:</strong> security@nexoral.in</li>
            <li><strong>Subject:</strong> [SECURITY] Brief description of the vulnerability</li>
            <li><strong>Encryption:</strong> PGP key available at nexoral.in/security (optional but recommended)</li>
          </ul>

          <h4>2. For Premium Customers</h4>
          <ul>
            <li>Use your priority support channel</li>
            <li>Mark the ticket as <strong>URGENT - SECURITY ISSUE</strong></li>
            <li>We guarantee faster response times for premium customers</li>
          </ul>

          <h4>3. GitHub Security Advisories</h4>
          <ul>
            <li>Use GitHub&apos;s Private Vulnerability Reporting</li>
            <li>This creates a private discussion with maintainers</li>
          </ul>

          <h3>What to Include in Your Report</h3>

          <ol>
            <li><strong>Vulnerability Type</strong>
              <ul>
                <li>Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)</li>
                <li>CWE or CVE reference if applicable</li>
              </ul>
            </li>
            <li><strong>Affected Components</strong>
              <ul>
                <li>Affected version(s)</li>
                <li>Affected component (DNS server, web dashboard, API, etc.)</li>
                <li>Free tier, premium tier, or both</li>
              </ul>
            </li>
            <li><strong>Impact Assessment</strong>
              <ul>
                <li>Potential impact (data breach, DoS, privilege escalation, etc.)</li>
                <li>Attack scenario and prerequisites</li>
                <li>Your assessment of severity (Critical/High/Medium/Low)</li>
              </ul>
            </li>
            <li><strong>Reproduction Steps</strong>
              <ul>
                <li>Detailed step-by-step instructions to reproduce</li>
                <li>Proof of concept code (if applicable)</li>
                <li>Screenshots or videos demonstrating the issue</li>
              </ul>
            </li>
            <li><strong>Suggested Mitigation</strong>
              <ul>
                <li>Any workarounds or temporary fixes</li>
                <li>Suggested patches (if you have them)</li>
              </ul>
            </li>
          </ol>

          <h2>Response Timeline</h2>

          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Free Tier</th>
                <th>Premium Tier</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Initial Response</strong></td>
                <td>Within 5 business days</td>
                <td>Within 24 hours</td>
              </tr>
              <tr>
                <td><strong>Status Update</strong></td>
                <td>Weekly</td>
                <td>Every 2-3 days</td>
              </tr>
              <tr>
                <td><strong>Triage Complete</strong></td>
                <td>Within 14 days</td>
                <td>Within 3-5 days</td>
              </tr>
              <tr>
                <td><strong>Fix Development</strong></td>
                <td>Varies by severity</td>
                <td>Priority handling</td>
              </tr>
              <tr>
                <td><strong>Patch Release</strong></td>
                <td>Coordinated disclosure</td>
                <td>Early access</td>
              </tr>
            </tbody>
          </table>

          <h3>Severity Response Targets</h3>

          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Initial Response</th>
                <th>Fix Target</th>
                <th>Public Disclosure</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Critical</strong></td>
                <td>24 hours</td>
                <td>7-14 days</td>
                <td>After patch release</td>
              </tr>
              <tr>
                <td><strong>High</strong></td>
                <td>48 hours</td>
                <td>14-30 days</td>
                <td>After patch release</td>
              </tr>
              <tr>
                <td><strong>Medium</strong></td>
                <td>5 days</td>
                <td>30-60 days</td>
                <td>After patch release</td>
              </tr>
              <tr>
                <td><strong>Low</strong></td>
                <td>10 days</td>
                <td>Next release</td>
                <td>With release notes</td>
              </tr>
            </tbody>
          </table>

          <h2>Security Best Practices for Users</h2>

          <h3>For All Users</h3>

          <h4>1. Keep Updated</h4>
          <CopyCodeBlock code="curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update" />

          <h4>2. Change Default Credentials</h4>
          <ul>
            <li>Change default admin password immediately after installation</li>
            <li>Use strong, unique passwords</li>
          </ul>

          <h4>3. Network Security</h4>
          <ul>
            <li><strong>DO NOT expose to public internet</strong> (DNS port 53, Web port 4000)</li>
            <li>Use only within your LAN as intended</li>
            <li>Configure firewall rules appropriately</li>
          </ul>

          <h4>4. Access Control</h4>
          <ul>
            <li>Limit access to the web dashboard</li>
            <li>Use premium tier for multi-user environments</li>
            <li>Regularly review user access</li>
          </ul>

          <h4>5. Monitor Logs</h4>
          <ul>
            <li>Regularly check DNS query logs for suspicious activity</li>
            <li>Enable alerts for unusual patterns (premium feature)</li>
          </ul>

          <h4>6. Backup Configuration</h4>
          <ul>
            <li>Regularly backup your configuration</li>
            <li>Test restore procedures</li>
            <li>Store backups securely</li>
          </ul>

          <h3>For Premium Users</h3>

          <h4>7. Enable Advanced Security Features</h4>
          <ul>
            <li>Configure access control policies</li>
            <li>Set up IP-based restrictions</li>
            <li>Use API keys with limited permissions</li>
          </ul>

          <h4>8. Audit Trail</h4>
          <ul>
            <li>Review audit logs regularly</li>
            <li>Monitor user actions</li>
            <li>Set up automated alerting</li>
          </ul>

          <h2>Security Updates</h2>

          <h3>Notification Channels</h3>

          <p>Security updates are announced through:</p>

          <ol>
            <li><strong>GitHub Security Advisories</strong> - Watch the repository</li>
            <li><strong>Release Notes</strong> - Always check before updating</li>
            <li><strong>Premium Email</strong> - Premium customers receive direct notifications</li>
            <li><strong>Website</strong> - nexoral.in/security</li>
          </ol>

          <h3>Applying Security Updates</h3>

          <CopyCodeBlock
            code={`# For Docker installations
curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update

# Verify update
cat VERSION`}
          />

          <p>
            Always review release notes before updating to understand what&apos;s changed.
          </p>

          <h2>Scope</h2>

          <h3>In Scope</h3>

          <p>The following are within the scope of our security program:</p>

          <ul>
            <li>✅ NexoralDNS server application (DNS server, DHCP, Broker)</li>
            <li>✅ Web dashboard and management interface</li>
            <li>✅ API endpoints and authentication</li>
            <li>✅ Access control mechanisms</li>
            <li>✅ Data storage and encryption</li>
            <li>✅ Docker containers and configurations</li>
            <li>✅ Installation scripts</li>
          </ul>

          <h3>Out of Scope</h3>

          <p>The following are <strong>NOT</strong> in scope:</p>

          <ul>
            <li>❌ Vulnerabilities in third-party dependencies (report to upstream)</li>
            <li>❌ Social engineering attacks</li>
            <li>❌ Physical security attacks</li>
            <li>❌ Denial of Service (DoS) attacks</li>
            <li>❌ Issues requiring physical access to the server</li>
            <li>❌ Issues that only affect outdated/unsupported versions</li>
            <li>❌ Issues in user-modified installations (license violation)</li>
            <li>❌ Theoretical vulnerabilities without practical exploit</li>
          </ul>

          <h2>Safe Harbor</h2>

          <p>
            We support security research conducted in good faith. We will not pursue legal action
            against researchers who:
          </p>

          <ul>
            <li>Make a good faith effort to avoid privacy violations, data destruction, and service interruption</li>
            <li>Only interact with accounts they own or with explicit permission</li>
            <li>Do not exploit vulnerabilities beyond what&apos;s necessary to demonstrate the issue</li>
            <li>Follow this disclosure policy</li>
            <li>Do not violate any laws</li>
          </ul>

          <h2>Hall of Fame</h2>

          <p>
            We recognize and thank security researchers who have responsibly disclosed vulnerabilities:
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 my-6 text-center">
            <p className="text-gray-500 italic mb-0">
              No vulnerabilities have been publicly disclosed yet.
            </p>
            <p className="text-sm text-gray-600 mb-0 mt-2">
              Want to see your name here? Help us improve NexoralDNS security!
            </p>
          </div>

          <h2>Contact</h2>

          <ul>
            <li><strong>Security Email:</strong> security@nexoral.in</li>
            <li><strong>General Contact:</strong> <a href="https://nexoral.in">nexoral.in</a></li>
            <li><strong>GitHub:</strong> <a href="https://github.com/nexoral/NexoralDNS">github.com/nexoral/NexoralDNS</a></li>
          </ul>

          <p>
            For non-security issues, please use our <a href="https://github.com/nexoral/NexoralDNS/issues">issue tracker</a>
            {" "}or see the <a href="/docs/contributing">Contributing Guide</a>.
          </p>

          <hr />

          <p className="text-center text-gray-500">
            <strong>Thank you for helping keep NexoralDNS and our users safe!</strong> 🔒
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
