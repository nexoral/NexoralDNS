import type { Metadata } from "next";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "Configuration - NexoralDNS Documentation",
  description: "Learn how to configure NexoralDNS. Customize DNS settings, upstream providers, caching, and more.",
};

export default function ConfigurationPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Configuration
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Customize NexoralDNS to fit your needs. Most settings can be configured through the dashboard or environment variables.
            </p>
          </div>
        </FadeIn>

        {/* Configuration Methods */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <StaggerItem className="p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🖥️</span>
              <h3 className="text-xl font-bold text-white">Dashboard</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Most settings can be configured directly from the web dashboard at <code className="text-blue-400">localhost:4000</code>. Changes take effect immediately.
            </p>
          </StaggerItem>
          <StaggerItem className="p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚙️</span>
              <h3 className="text-xl font-bold text-white">Environment Variables</h3>
            </div>
            <p className="text-gray-400 text-sm">
              For advanced users, configure NexoralDNS via environment variables in the Docker Compose file or .env file.
            </p>
          </StaggerItem>
        </StaggerContainer>

        {/* DNS Settings */}
        <section className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">🌐</span>
              DNS Settings
            </h2>
          </FadeIn>

          <StaggerContainer className="space-y-6">
            <StaggerItem className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">Upstream DNS Providers</h3>
              <p className="text-gray-400 mb-4">
                Configure which DNS servers to use for resolving external domains. NexoralDNS forwards queries it can&apos;t resolve locally to these providers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  { name: "Cloudflare", ip: "1.1.1.1", desc: "Fast & privacy-focused" },
                  { name: "Google", ip: "8.8.8.8", desc: "Reliable & fast" },
                  { name: "Quad9", ip: "9.9.9.9", desc: "Security-focused" },
                  { name: "OpenDNS", ip: "208.67.222.222", desc: "Family-friendly options" },
                ].map((provider) => (
                  <div key={provider.name} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{provider.name}</span>
                      <code className="text-sm text-blue-400">{provider.ip}</code>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{provider.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Configure in Dashboard → Settings → DNS Providers
              </p>
            </StaggerItem>

            <StaggerItem className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">DNS Port</h3>
              <p className="text-gray-400 mb-4">
                By default, NexoralDNS listens on port 53 (standard DNS port). You can change this if needed.
              </p>
              <CopyCodeBlock code="DNS_PORT=53" />
              <p className="text-sm text-gray-500 mt-3">
                ⚠️ Changing from port 53 requires additional router configuration.
              </p>
            </StaggerItem>

            <StaggerItem className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">Cache Settings</h3>
              <p className="text-gray-400 mb-4">
                Control how long DNS responses are cached. Longer TTL = fewer upstream queries, but slower updates.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Default TTL</span>
                  <code className="text-blue-400">300 seconds (5 min)</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Max Cache Size</span>
                  <code className="text-blue-400">10,000 entries</code>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Negative Cache TTL</span>
                  <code className="text-blue-400">60 seconds</code>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* Environment Variables */}
        <section className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">🔧</span>
              Environment Variables
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="pb-3 text-gray-400 font-medium">Variable</th>
                    <th className="pb-3 text-gray-400 font-medium">Default</th>
                    <th className="pb-3 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { var: "DNS_PORT", default: "53", desc: "Port for DNS server" },
                    { var: "WEB_PORT", default: "4000", desc: "Port for web dashboard" },
                    { var: "UPSTREAM_DNS", default: "1.1.1.1", desc: "Primary upstream DNS" },
                    { var: "CACHE_TTL", default: "300", desc: "Default cache TTL in seconds" },
                    { var: "LOG_LEVEL", default: "info", desc: "Logging level (debug, info, warn, error)" },
                    { var: "REDIS_URL", default: "redis://localhost:6379", desc: "Redis connection URL" },
                    { var: "DB_PATH", default: "/data/nexoraldns.db", desc: "Database file path" },
                    { var: "ENABLE_ANALYTICS", default: "true", desc: "Enable query analytics" },
                  ].map((env) => (
                    <tr key={env.var}>
                      <td className="py-3">
                        <code className="text-blue-400 text-sm">{env.var}</code>
                      </td>
                      <td className="py-3">
                        <code className="text-gray-400 text-sm">{env.default}</code>
                      </td>
                      <td className="py-3 text-gray-400 text-sm">{env.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </section>

        {/* Example Docker Compose */}
        <section className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">🐳</span>
              Docker Compose Example
            </h2>

            <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
              <p className="text-gray-400 mb-4">
                Customize your deployment by modifying the Docker Compose file:
              </p>
              <CopyCodeBlock code={`version: '3.8'
services:
  nexoraldns:
    image: nexoral/nexoraldns:latest
    ports:
      - "53:53/udp"
      - "53:53/tcp"
      - "4000:4000"
    environment:
      - UPSTREAM_DNS=1.1.1.1
      - CACHE_TTL=300
      - LOG_LEVEL=info
      - ENABLE_ANALYTICS=true
    volumes:
      - nexoraldns-data:/data
    restart: unless-stopped

volumes:
  nexoraldns-data:`} />
            </div>
          </FadeIn>
        </section>

        {/* Security Settings */}
        <section className="mb-12">
          <FadeIn>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">🔒</span>
              Security Settings
            </h2>
          </FadeIn>

          <StaggerContainer className="space-y-4">
            <StaggerItem className="p-5 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Dashboard Authentication</h3>
              <p className="text-gray-400 text-sm">
                The dashboard is protected by authentication. Change the default password immediately after installation via Dashboard → Settings → Security.
              </p>
            </StaggerItem>
            <StaggerItem className="p-5 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-2">API Authentication</h3>
              <p className="text-gray-400 text-sm">
                API requests require an API key. Generate keys in Dashboard → Settings → API Keys. Use the key in the <code className="text-blue-400">Authorization</code> header.
              </p>
            </StaggerItem>
            <StaggerItem className="p-5 bg-gray-900/50 border border-gray-800 rounded-xl">
              <h3 className="font-semibold text-white mb-2">Rate Limiting</h3>
              <p className="text-gray-400 text-sm">
                Enable rate limiting to prevent DNS amplification attacks. Configure max queries per IP in Dashboard → Settings → Security.
              </p>
            </StaggerItem>
          </StaggerContainer>
        </section>

        {/* Tips */}
        <FadeIn delay={0.2}>
          <div className="p-6 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/20 rounded-2xl">
            <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <span>💡</span>
              Pro Tips
            </h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                Back up your configuration before making major changes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                Use multiple upstream DNS providers for redundancy
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                Monitor query logs after configuration changes to ensure everything works
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                Keep your NexoralDNS installation updated for security patches
              </li>
            </ul>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
