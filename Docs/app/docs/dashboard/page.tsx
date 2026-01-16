import type { Metadata } from "next";
import { FadeIn } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "Dashboard - NexoralDNS Documentation",
  description: "Overview of the NexoralDNS dashboard features and usage.",
};

export default function Dashboard() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>Dashboard Overview</h1>

          <p className="text-xl text-gray-400">
            The NexoralDNS dashboard is your central control hub for managing DNS records, monitoring traffic, and configuring settings.
          </p>

          <h2>Accessing the Dashboard</h2>

          <p>
            By default, the dashboard is available at:
          </p>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 my-4">
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-lg">
              http://localhost:3000
            </a>
          </div>

          <p>
            <strong>Default Credentials:</strong>
          </p>
          <ul>
            <li><strong>Email:</strong> <code>admin@example.com</code></li>
            <li><strong>Password:</strong> <code>password123</code></li>
          </ul>

          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-6">
            <p className="text-yellow-400 font-semibold mb-2">⚠️ Security Warning</p>
            <p className="text-sm text-gray-300 mb-0">
              Please change the default password immediately after your first login!
            </p>
          </div>

          <h2>Main Sections</h2>

          <h3>1. Overview</h3>
          <p>
            The landing page provides a real-time snapshot of your DNS server's health and performance.
          </p>
          <ul>
            <li><strong>Total Queries:</strong> Number of DNS queries processed in the last 24 hours.</li>
            <li><strong>Blocked Queries:</strong> Number of queries blocked by your rules.</li>
            <li><strong>Cache Hit Rate:</strong> Percentage of queries served from Redis cache.</li>
            <li><strong>Active Clients:</strong> Number of unique IP addresses making queries.</li>
            <li><strong>System Status:</strong> CPU and Memory usage of the DNS server.</li>
          </ul>

          <h3>2. DNS Records</h3>
          <p>
            Manage your custom DNS records here. You can add, edit, or delete records.
          </p>
          <ul>
            <li><strong>A Records:</strong> Map a hostname to an IPv4 address.</li>
            <li><strong>AAAA Records:</strong> Map a hostname to an IPv6 address.</li>
            <li><strong>CNAME Records:</strong> Map a hostname to another hostname (alias).</li>
            <li><strong>TXT Records:</strong> Store text information (e.g., SPF, verification).</li>
          </ul>

          <h3>3. Rewrites</h3>
          <p>
            Create rules to redirect specific domains to different targets.
          </p>
          <ul>
            <li><strong>Source Domain:</strong> The domain being queried (e.g., <code>google.com</code>).</li>
            <li><strong>Target Domain:</strong> The domain to resolve instead (e.g., <code>forcesafesearch.google.com</code>).</li>
            <li><strong>Client Specific:</strong> Apply rules only to specific client IPs.</li>
          </ul>

          <h3>4. Blocking</h3>
          <p>
            Configure domain blocking to prevent access to unwanted sites.
          </p>
          <ul>
            <li><strong>Exact Match:</strong> Block a specific domain (e.g., <code>ads.example.com</code>).</li>
            <li><strong>Wildcard:</strong> Block all subdomains (e.g., <code>*.ads.example.com</code>).</li>
            <li><strong>Block Lists:</strong> Subscribe to public block lists (e.g., StevenBlack/hosts).</li>
            <li><strong>Allow Lists:</strong> Whitelist domains that should never be blocked.</li>
          </ul>

          <h3>5. Query Logs</h3>
          <p>
            View detailed logs of all DNS queries processed by your server.
          </p>
          <ul>
            <li><strong>Timestamp:</strong> When the query was received.</li>
            <li><strong>Client IP:</strong> Who made the request.</li>
            <li><strong>Domain:</strong> What domain was requested.</li>
            <li><strong>Type:</strong> Record type (A, AAAA, etc.).</li>
            <li><strong>Status:</strong> Result (NOERROR, NXDOMAIN, BLOCKED).</li>
            <li><strong>Response Time:</strong> How long it took to process.</li>
          </ul>

          <h3>6. Settings</h3>
          <p>
            Configure global server settings.
          </p>
          <ul>
            <li><strong>Upstream DNS:</strong> Set the upstream resolvers (e.g., Google, Cloudflare).</li>
            <li><strong>Cache TTL:</strong> Configure how long records are cached.</li>
            <li><strong>Rate Limiting:</strong> Set query limits per client to prevent abuse.</li>
            <li><strong>User Management:</strong> Add or remove dashboard users.</li>
          </ul>

          <h2>Mobile Support</h2>

          <p>
            The dashboard is fully responsive and works great on mobile devices. You can manage your DNS server from your phone or tablet.
          </p>

          <h2>Dark Mode</h2>

          <p>
            Toggle between light and dark themes using the sun/moon icon in the top right corner.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
