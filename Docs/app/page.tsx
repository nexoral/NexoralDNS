import Link from "next/link";
import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function Home() {
  const installCommand = "curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-24">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-sm text-blue-400 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Open Source DNS Solution for Local Networks
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Take Control of Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Network&apos;s DNS
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              NexoralDNS is a powerful, self-hosted DNS management system that gives you complete visibility
              and control over your local network&apos;s DNS traffic. Monitor, filter, and create custom domains
              without any external dependencies.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Link
                href="/docs/getting-started"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:text-white no-underline font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
              >
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="https://github.com/nexoral/NexoralDNS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* Quick Install Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative p-6 sm:p-8 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl">
              <div className="absolute -top-3 left-6">
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-full">
                  One-Command Install
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-4 mt-2">
                Copy and paste this command into your terminal to install NexoralDNS:
              </p>
              <CopyCodeBlock code={installCommand} />
              <p className="text-xs text-gray-500 mt-4 text-center">
                Automatically installs Docker, downloads the latest version, and starts all services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="px-4 sm:px-6 lg:px-12 py-16 bg-gradient-to-b from-transparent to-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Why NexoralDNS?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Traditional DNS solutions leave you blind to what&apos;s happening on your network.
              NexoralDNS changes that.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Problem */}
            <div className="p-6 sm:p-8 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-red-400">The Problem</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "No visibility into DNS requests on your network",
                  "Can't create custom internal domains easily",
                  "Host file modifications needed on each device",
                  "No way to block malicious or unwanted domains",
                  "Third-party DNS providers track your data"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-400">
                    <span className="text-red-400 mt-1">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div className="p-6 sm:p-8 bg-green-500/5 border border-green-500/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-green-400">The Solution</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Real-time dashboard showing all DNS queries",
                  "Create custom domains with one click (e.g., myapp.local)",
                  "Network-wide DNS settings - configure once",
                  "Block ads, trackers, and malicious domains",
                  "100% self-hosted - your data stays private"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-400">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 sm:px-6 lg:px-12 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage DNS on your local network
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🌐",
                title: "Custom Domains",
                description: "Create internal domains like myapp.local, dashboard.home without external DNS",
                color: "blue"
              },
              {
                icon: "📊",
                title: "Real-time Analytics",
                description: "Monitor all DNS queries with detailed logs, charts, and traffic patterns",
                color: "purple"
              },
              {
                icon: "🛡️",
                title: "Domain Blocking",
                description: "Block ads, trackers, malware domains, and set up parental controls",
                color: "green"
              },
              {
                icon: "⚡",
                title: "Ultra Fast",
                description: "Sub-5ms response times with Redis caching and optimized architecture",
                color: "yellow"
              },
              {
                icon: "🖥️",
                title: "Web Dashboard",
                description: "Beautiful, intuitive dashboard accessible at localhost:4000",
                color: "cyan"
              },
              {
                icon: "🔧",
                title: "Easy Setup",
                description: "One command installation with Docker - up and running in minutes",
                color: "orange"
              },
              {
                icon: "👥",
                title: "Multi-device",
                description: "Manage DNS for all devices on your network from one place",
                color: "pink"
              },
              {
                icon: "🔌",
                title: "REST API",
                description: "Full API access for automation and integration with other tools",
                color: "indigo"
              },
              {
                icon: "📱",
                title: "Responsive UI",
                description: "Access and manage from any device - desktop, tablet, or mobile",
                color: "teal"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-100">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-4 sm:px-6 lg:px-12 py-16 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Perfect For
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              NexoralDNS adapts to your needs, whether at home or work
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                emoji: "👨‍💻",
                title: "Developers & Teams",
                description: "Create custom development domains, share local services with teammates, and simplify your development workflow without modifying host files on every machine.",
                highlights: ["Local .dev domains", "Team collaboration", "Service discovery"]
              },
              {
                emoji: "🏢",
                title: "Small Businesses",
                description: "Centralized DNS management for your office network. Create internal domains for services, monitor employee network usage, and enhance security.",
                highlights: ["Central management", "Usage monitoring", "Security filtering"]
              },
              {
                emoji: "🏠",
                title: "Home Networks",
                description: "Block ads network-wide, set up parental controls, create domains for smart home devices, and monitor what devices are accessing on your network.",
                highlights: ["Ad blocking", "Parental controls", "IoT management"]
              },
              {
                emoji: "🏫",
                title: "Educational Institutions",
                description: "Control student access to websites, monitor network usage patterns, and provide a safe browsing environment across your campus network.",
                highlights: ["Content filtering", "Usage analytics", "Safe browsing"]
              }
            ].map((useCase, index) => (
              <div
                key={index}
                className="p-6 sm:p-8 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-700 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl">{useCase.emoji}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-100">{useCase.title}</h3>
                  </div>
                </div>
                <p className="text-gray-400 mb-4 leading-relaxed">{useCase.description}</p>
                <div className="flex flex-wrap gap-2">
                  {useCase.highlights.map((highlight, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning Section */}
      <section className="px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 sm:p-8 bg-gradient-to-br from-red-900/20 to-orange-900/20 border-2 border-red-500/30 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Important: LAN Use Only</h3>
                <p className="text-gray-300 mb-4">
                  NexoralDNS is designed exclusively for Local Area Network (LAN) use.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-red-400 mb-2">❌ Do NOT:</p>
                    <ul className="space-y-1 text-gray-400">
                      <li>• Host on cloud platforms</li>
                      <li>• Expose to public internet</li>
                      <li>• Use as public DNS resolver</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-green-400 mb-2">✅ Do:</p>
                    <ul className="space-y-1 text-gray-400">
                      <li>• Install on local machine</li>
                      <li>• Configure router to use it</li>
                      <li>• Keep within private network</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="px-4 sm:px-6 lg:px-12 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Explore Documentation
            </h2>
            <p className="text-gray-400">
              Everything you need to get started and master NexoralDNS
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/docs/getting-started", title: "Getting Started", desc: "Quick start guide", icon: "🚀", color: "from-blue-600/20 to-cyan-600/20", border: "border-blue-600/30" },
              { href: "/docs/installation", title: "Installation", desc: "Detailed setup", icon: "⚡", color: "from-green-600/20 to-emerald-600/20", border: "border-green-600/30" },
              { href: "/docs/configuration", title: "Configuration", desc: "Customize settings", icon: "⚙️", color: "from-purple-600/20 to-pink-600/20", border: "border-purple-600/30" },
              { href: "/docs/dashboard", title: "Dashboard Guide", desc: "Using the UI", icon: "🖥️", color: "from-orange-600/20 to-yellow-600/20", border: "border-orange-600/30" },
              { href: "/docs/api", title: "API Reference", desc: "REST API docs", icon: "🔌", color: "from-cyan-600/20 to-blue-600/20", border: "border-cyan-600/30" },
              { href: "/docs/features", title: "Features", desc: "All capabilities", icon: "✨", color: "from-pink-600/20 to-rose-600/20", border: "border-pink-600/30" },
              { href: "/docs/faq", title: "FAQ", desc: "Common questions", icon: "❓", color: "from-indigo-600/20 to-purple-600/20", border: "border-indigo-600/30" },
              { href: "/docs/troubleshooting", title: "Troubleshooting", desc: "Solve issues", icon: "🔧", color: "from-red-600/20 to-orange-600/20", border: "border-red-600/30" }
            ].map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className={`group p-5 bg-gradient-to-br ${link.color} border ${link.border} rounded-xl hover:scale-105 transition-all duration-300`}
              >
                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{link.icon}</span>
                <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">{link.title}</h3>
                <p className="text-xs text-gray-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-12 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 sm:p-12 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/20 rounded-3xl text-center overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Ready to Take Control?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join thousands of users who have transformed their network&apos;s DNS infrastructure with NexoralDNS.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/docs/getting-started"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Start Free
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
