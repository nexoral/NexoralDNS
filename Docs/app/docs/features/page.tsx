import { FadeIn } from "@/components/MotionWrapper";

export default function Features() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>Feature Comparison</h1>

          <p className="text-xl text-gray-400">
            NexoralDNS offers a feature-rich free tier with essential DNS management capabilities,
            and a premium tier that unlocks advanced enterprise features.
          </p>

          <h2>Feature Matrix</h2>

          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free Tier</th>
                <th>Premium Tier</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="bg-gray-800 font-semibold">Core DNS Functionality</td>
              </tr>
              <tr>
                <td>DNS Server (Port 53)</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Web-based Management Dashboard</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Custom Domain Management</td>
                <td>✅ Limited (10 domains)</td>
                <td>✅ Unlimited</td>
              </tr>
              <tr>
                <td>DNS Query Logging</td>
                <td>✅ 7 days</td>
                <td>✅ Unlimited history</td>
              </tr>
              <tr>
                <td>Basic Analytics Dashboard</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td colSpan={3} className="bg-gray-800 font-semibold">Advanced Features</td>
              </tr>
              <tr>
                <td>Access Control Policies</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>IP-based Domain Restrictions</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Domain Group Management</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Advanced Analytics & Reporting</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Real-time Query Monitoring</td>
                <td>✅ Limited</td>
                <td>✅ Full</td>
              </tr>
              <tr>
                <td>Custom Blocking Rules</td>
                <td>✅ Up to 50 rules</td>
                <td>✅ Unlimited</td>
              </tr>
              <tr>
                <td colSpan={3} className="bg-gray-800 font-semibold">Security & Management</td>
              </tr>
              <tr>
                <td>DHCP Server Integration</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Multi-user Management</td>
                <td>❌ Single admin</td>
                <td>✅ Multiple users with roles</td>
              </tr>
              <tr>
                <td>API Access</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Backup & Restore</td>
                <td>✅ Manual</td>
                <td>✅ Automated</td>
              </tr>
              <tr>
                <td>Cloud Sync</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td colSpan={3} className="bg-gray-800 font-semibold">Support & Updates</td>
              </tr>
              <tr>
                <td>Software Updates</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Community Support</td>
                <td>✅</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Priority Email Support</td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td>Feature Requests</td>
                <td>✅</td>
                <td>✅ Priority</td>
              </tr>
            </tbody>
          </table>

          <h2>Free Tier Details</h2>

          <h3>What&apos;s Included (Forever Free)</h3>
          <ul>
            <li>✅ Full DNS server functionality</li>
            <li>✅ Web-based management interface at <code>localhost:4000</code></li>
            <li>✅ Up to 10 custom domains</li>
            <li>✅ Basic DNS query logging (7-day retention)</li>
            <li>✅ Up to 50 domain blocking rules</li>
            <li>✅ Basic analytics dashboard</li>
            <li>✅ Real-time query monitoring (limited view)</li>
            <li>✅ Community support via GitHub issues</li>
            <li>✅ Regular software updates</li>
          </ul>

          <h3>Free Tier Limitations</h3>
          <ul>
            <li>⚠️ Limited to 10 custom domains</li>
            <li>⚠️ 7-day log retention only</li>
            <li>⚠️ No access control policies</li>
            <li>⚠️ No DHCP server integration</li>
            <li>⚠️ No API access</li>
            <li>⚠️ No automated backups</li>
            <li>⚠️ Single administrator account</li>
            <li>⚠️ Limited blocking rules (50 max)</li>
          </ul>

          <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-6 my-8">
            <h4 className="text-blue-400 font-semibold mb-3">Perfect for:</h4>
            <ul className="space-y-2 mb-0">
              <li>🏠 Home users and small networks</li>
              <li>👨‍💻 Individual developers</li>
              <li>🧪 Testing and learning DNS management</li>
              <li>📚 Educational purposes</li>
            </ul>
          </div>

          <h2>Premium Tier Details</h2>

          <h3>What&apos;s Unlocked with Premium</h3>
          <ul>
            <li>🚀 <strong>Unlimited Everything:</strong> No restrictions on domains, rules, or users</li>
            <li>🛡️ <strong>Advanced Access Control:</strong> IP-based restrictions and domain groups</li>
            <li>📊 <strong>Enterprise Analytics:</strong> Detailed reporting and insights</li>
            <li>🔗 <strong>DHCP Integration:</strong> Unified network management</li>
            <li>👥 <strong>Multi-user Support:</strong> Role-based access control</li>
            <li>🔌 <strong>API Access:</strong> Programmatic control and automation</li>
            <li>☁️ <strong>Cloud Sync:</strong> Backup and sync configurations</li>
            <li>⚡ <strong>Priority Support:</strong> Email support with faster response times</li>
            <li>📈 <strong>Unlimited History:</strong> Never lose your DNS logs</li>
          </ul>

          <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-6 my-8">
            <h4 className="text-purple-400 font-semibold mb-3">Perfect for:</h4>
            <ul className="space-y-2 mb-0">
              <li>🏢 Small to medium businesses</li>
              <li>👨‍💼 IT professionals and system administrators</li>
              <li>🏫 Educational institutions</li>
              <li>👨‍💻 Development teams requiring advanced features</li>
              <li>🔒 Organizations with security and compliance requirements</li>
            </ul>
          </div>

          <h2>Core Features (All Tiers)</h2>

          <h3>1. Custom Domain Management</h3>
          <p>
            Create internal domains like <code>myapp.local</code> that resolve only within your LAN.
            No need to modify host files on every machine.
          </p>

          <h3>2. DNS Traffic Monitoring</h3>
          <p>
            Comprehensive logging of all DNS queries with detailed analytics. Track which domains are
            being accessed, when, and by whom.
          </p>

          <h3>3. Domain Blocking</h3>
          <p>
            Block unwanted domains network-wide or for specific devices. Perfect for parental controls,
            ad blocking, or blocking malicious domains.
          </p>

          <h3>4. Domain Rerouting</h3>
          <p>
            Redirect specific domains to different IP addresses. For example, redirect <code>google.com</code>
            to your internal server for testing.
          </p>

          <h3>5. Web-based Dashboard</h3>
          <p>
            Intuitive management interface accessible at <code>localhost:4000</code>. No command-line
            required for basic operations.
          </p>

          <h3>6. High Performance</h3>
          <p>
            Sub-5ms query response times with Redis caching. Optimized for high-volume networks with
            7-layer query processing.
          </p>

          <h2>Pricing</h2>

          <h3>Get Your Premium License</h3>
          <p>
            Visit <a href="https://nexoral.in" target="_blank" rel="noopener noreferrer">nexoral.in</a> to:
          </p>
          <ul>
            <li>View detailed pricing plans</li>
            <li>Purchase a commercial license</li>
            <li>Get activation keys instantly</li>
            <li>Access premium support</li>
          </ul>

          <h3>License Terms</h3>
          <ul>
            <li>✅ Perpetual licenses available</li>
            <li>✅ Subscription options for latest features</li>
            <li>✅ Volume discounts for multiple installations</li>
            <li>✅ 30-day money-back guarantee</li>
            <li>✅ Free trial available (contact sales)</li>
          </ul>

          <h2>How to Upgrade</h2>

          <ol>
            <li><strong>Purchase License:</strong> Visit <a href="https://nexoral.in">nexoral.in</a> and select your plan</li>
            <li><strong>Get Activation Key:</strong> You&apos;ll receive your license key via email immediately</li>
            <li><strong>Activate in Dashboard:</strong>
              <ul>
                <li>Open NexoralDNS dashboard at <code>http://localhost:4000</code></li>
                <li>Navigate to Settings → License</li>
                <li>Enter your activation key</li>
                <li>Click &quot;Activate Premium Features&quot;</li>
              </ul>
            </li>
            <li><strong>Enjoy Premium Features:</strong> All premium features will be instantly unlocked!</li>
          </ol>

          <h2>Frequently Asked Questions</h2>

          <h3>Q: Can I try premium features before buying?</h3>
          <p>
            <strong>A:</strong> Contact our sales team at <a href="https://nexoral.in">nexoral.in</a> for a trial key.
          </p>

          <h3>Q: Is the free tier limited by time?</h3>
          <p>
            <strong>A:</strong> No! The free tier is completely free forever with no time restrictions.
          </p>

          <h3>Q: Can I upgrade from free to premium later?</h3>
          <p>
            <strong>A:</strong> Yes! You can upgrade at any time by purchasing a license. Your existing
            configuration will be preserved.
          </p>

          <h3>Q: Do I need separate licenses for multiple installations?</h3>
          <p>
            <strong>A:</strong> Yes, each installation requires its own license key. Volume discounts are available.
          </p>

          <h3>Q: What happens if my premium license expires?</h3>
          <p>
            <strong>A:</strong> You&apos;ll revert to free tier limitations, but your data remains safe.
            You can reactivate anytime.
          </p>

          <h2>Comparison Summary</h2>

          <table>
            <thead>
              <tr>
                <th>Aspect</th>
                <th>Free</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Price</strong></td>
                <td>$0 Forever</td>
                <td>See <a href="https://nexoral.in">nexoral.in</a></td>
              </tr>
              <tr>
                <td><strong>Custom Domains</strong></td>
                <td>10</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td><strong>Blocking Rules</strong></td>
                <td>50</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td><strong>Log Retention</strong></td>
                <td>7 days</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td><strong>Users</strong></td>
                <td>1 admin</td>
                <td>Multiple with roles</td>
              </tr>
              <tr>
                <td><strong>Access Control</strong></td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td><strong>DHCP Server</strong></td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td><strong>API Access</strong></td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td><strong>Cloud Sync</strong></td>
                <td>❌</td>
                <td>✅</td>
              </tr>
              <tr>
                <td><strong>Support</strong></td>
                <td>Community</td>
                <td>Priority Email</td>
              </tr>
              <tr>
                <td><strong>Best For</strong></td>
                <td>Home/Learning</td>
                <td>Business/Enterprise</td>
              </tr>
            </tbody>
          </table>

          <div className="text-center my-12">
            <h3 className="text-2xl font-bold mb-4">Ready to Upgrade?</h3>
            <p className="text-gray-400 mb-6">
              Unlock the full power of NexoralDNS with premium features
            </p>
            <a
              href="https://nexoral.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
