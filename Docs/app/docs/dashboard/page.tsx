import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard Guide - NexoralDNS Documentation",
  description: "Learn how to use the NexoralDNS dashboard. Navigate the UI, manage domains, view analytics, and configure settings.",
};

export default function DashboardPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Dashboard Guide
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            The NexoralDNS dashboard is your command center for managing DNS on your network. Here&apos;s how to use it effectively.
          </p>
        </div>

        {/* Access Info */}
        <div className="mb-12 p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">🌐</span>
            <div>
              <h3 className="text-lg font-bold text-white">Accessing the Dashboard</h3>
              <p className="text-gray-400 text-sm">Open your browser and navigate to:</p>
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <code className="text-blue-400 text-lg">http://localhost:4000</code>
            <p className="text-sm text-gray-500 mt-2">
              Or from other devices: <code className="text-gray-400">http://YOUR-SERVER-IP:4000</code>
            </p>
          </div>
        </div>

        {/* Dashboard Sections */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Dashboard Sections</h2>

          <div className="space-y-6">
            {/* Overview */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Overview</h3>
                  <p className="text-gray-400">Your DNS at a glance</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Queries", desc: "All DNS requests today" },
                  { label: "Blocked", desc: "Blocked domain requests" },
                  { label: "Cache Hit Rate", desc: "Queries served from cache" },
                  { label: "Active Devices", desc: "Devices using DNS" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm font-medium text-white">{stat.label}</p>
                    <p className="text-xs text-gray-500">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Query Log */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📝</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Query Log</h3>
                  <p className="text-gray-400">Real-time DNS query monitoring</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  View all DNS queries in real-time
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Filter by domain, client, or status
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  See which device made each request
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  One-click blocking of suspicious domains
                </li>
              </ul>
            </div>

            {/* Domains */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🌐</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Domains</h3>
                  <p className="text-gray-400">Manage custom and blocked domains</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Custom Domains</h4>
                  <p className="text-sm text-gray-400 mb-3">Create internal domains for your network</p>
                  <div className="p-2 bg-gray-900 rounded text-sm">
                    <code className="text-blue-400">myapp.local</code>
                    <span className="text-gray-500"> → </span>
                    <code className="text-green-400">192.168.1.100</code>
                  </div>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Blocked Domains</h4>
                  <p className="text-sm text-gray-400 mb-3">Block unwanted or dangerous domains</p>
                  <div className="p-2 bg-gray-900 rounded text-sm">
                    <code className="text-red-400">ads.example.com</code>
                    <span className="text-gray-500"> → </span>
                    <span className="text-red-400">BLOCKED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Devices */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📱</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Devices</h3>
                  <p className="text-gray-400">Track all devices on your network</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-orange-400">•</span>
                  See all devices making DNS queries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-400">•</span>
                  View per-device query statistics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-400">•</span>
                  Name devices for easy identification
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-400">•</span>
                  Apply device-specific rules and filters
                </li>
              </ul>
            </div>

            {/* Blocklists */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Blocklists</h3>
                  <p className="text-gray-400">Import and manage domain blocklists</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Subscribe to popular blocklists or import your own. Blocklists are automatically updated.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Ads", "Trackers", "Malware", "Adult Content", "Social Media"].map((list) => (
                  <span key={list} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full">
                    {list}
                  </span>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Settings</h3>
                  <p className="text-gray-400">Configure NexoralDNS</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "DNS Settings", desc: "Upstream providers, caching" },
                  { name: "Security", desc: "Authentication, API keys" },
                  { name: "Appearance", desc: "Theme, language" },
                  { name: "Backup", desc: "Export/import configuration" },
                ].map((setting) => (
                  <div key={setting.name} className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="font-medium text-white">{setting.name}</p>
                    <p className="text-xs text-gray-500">{setting.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Common Tasks */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Common Tasks</h2>

          <div className="space-y-4">
            <details className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-semibold text-white">How to add a custom domain</h3>
                <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 text-gray-400 text-sm space-y-2">
                <p>1. Go to <strong className="text-white">Domains</strong> in the sidebar</p>
                <p>2. Click <strong className="text-white">Add Domain</strong></p>
                <p>3. Enter the domain name (e.g., <code className="text-blue-400">myapp.local</code>)</p>
                <p>4. Enter the IP address to point to</p>
                <p>5. Click <strong className="text-white">Save</strong></p>
              </div>
            </details>

            <details className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-semibold text-white">How to block a domain</h3>
                <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 text-gray-400 text-sm space-y-2">
                <p><strong className="text-white">Option 1:</strong> From Query Log, click the ⛔ icon next to any query</p>
                <p><strong className="text-white">Option 2:</strong> Go to Blocklists → Add Domain → Enter domain to block</p>
              </div>
            </details>

            <details className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-semibold text-white">How to import a blocklist</h3>
                <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 text-gray-400 text-sm space-y-2">
                <p>1. Go to <strong className="text-white">Blocklists</strong></p>
                <p>2. Click <strong className="text-white">Add Blocklist</strong></p>
                <p>3. Paste the URL of the blocklist (supports hosts format)</p>
                <p>4. Set update frequency (daily, weekly)</p>
                <p>5. Click <strong className="text-white">Subscribe</strong></p>
              </div>
            </details>

            <details className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="font-semibold text-white">How to change upstream DNS</h3>
                <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center group-open:rotate-180 transition-transform">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="mt-4 text-gray-400 text-sm space-y-2">
                <p>1. Go to <strong className="text-white">Settings → DNS</strong></p>
                <p>2. Add/remove upstream DNS servers</p>
                <p>3. Drag to reorder priority</p>
                <p>4. Click <strong className="text-white">Save Changes</strong></p>
              </div>
            </details>
          </div>
        </section>

        {/* Next Steps */}
        <div className="p-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-2xl">
          <h3 className="text-xl font-bold text-green-400 mb-4">Next Steps</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/docs/features"
              className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-semibold text-white mb-1">Explore Features →</h4>
              <p className="text-sm text-gray-400">See all NexoralDNS capabilities</p>
            </Link>
            <Link
              href="/docs/api"
              className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-semibold text-white mb-1">API Reference →</h4>
              <p className="text-sm text-gray-400">Automate with the REST API</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
