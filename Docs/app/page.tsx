import Link from "next/link";
import CopyCodeBlock from "@/components/CopyCodeBlock";

export default function Home() {
  const installCommand = "curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -";

  return (
    <div className="px-6 py-12 lg:px-12">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black tracking-tight mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            NEXORALDNS
          </h1>
          <p className="text-2xl text-gray-400 mb-8 font-light">
            Advanced DNS Management & Surveillance System
          </p>

          {/* Version Badge */}
          <div className="flex justify-center gap-3 mb-12">
            <span className="px-4 py-1.5 bg-green-600/20 border border-green-600/30 text-green-400 rounded-full text-sm font-medium">
              Latest Stable
            </span>
            <span className="px-4 py-1.5 bg-blue-600/20 border border-blue-600/30 text-blue-400 rounded-full text-sm font-medium">
              Docker Supported
            </span>
            <span className="px-4 py-1.5 bg-purple-600/20 border border-purple-600/30 text-purple-400 rounded-full text-sm font-medium">
              Open Source Available
            </span>
          </div>
        </div>

        {/* Quick Install */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4 text-center">Quick Installation</h2>
          <p className="text-gray-400 text-center mb-6">
            Get started in seconds with our one-line installer
          </p>
          <CopyCodeBlock code={installCommand} />
          <p className="text-sm text-gray-500 text-center mt-4">
            That&apos;s it! The script will automatically install Docker, download the latest version, and start NexoralDNS.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🌐",
                title: "Custom Domain Management",
                description: "Create internal domains without external DNS servers"
              },
              {
                icon: "📈",
                title: "DNS Traffic Monitoring",
                description: "Comprehensive logging and real-time analytics"
              },
              {
                icon: "🐳",
                title: "Easy Deployment",
                description: "One-command installation via Docker"
              },
              {
                icon: "🖥️",
                title: "Web-based Management",
                description: "Intuitive dashboard accessible at localhost:4000"
              },
              {
                icon: "🛡️",
                title: "Security Filtering",
                description: "Block unwanted domains and protect your network"
              },
              {
                icon: "⚡",
                title: "High Performance",
                description: "Sub-5ms query response times with Redis caching"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-gray-900 border border-gray-800 rounded-lg hover:border-blue-600/50 transition-all duration-200"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-100">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Warning Box */}
        <div className="mb-16 p-6 bg-red-900/20 border-2 border-red-600/50 rounded-lg">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2">IMPORTANT: LAN USE ONLY</h3>
              <p className="text-gray-300 mb-3">
                <strong>DO NOT HOST THIS ON THE CLOUD OR PUBLIC INTERNET</strong>
              </p>
              <p className="text-sm text-gray-400">
                NexoralDNS is strictly designed for Local Area Network (LAN) use only.
                Hosting on cloud platforms will result in DNS spoofing detection, automatic blocking by ISPs,
                and service disruption. Always ensure NexoralDNS remains within your private network boundaries.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link
            href="/docs/installation"
            className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-600/30 rounded-lg hover:border-blue-500 transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
              Installation Guide →
            </h3>
            <p className="text-gray-400 text-sm">
              Complete installation instructions, system requirements, and post-setup configuration
            </p>
          </Link>

          <Link
            href="/docs/architecture"
            className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-lg hover:border-purple-500 transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
              Architecture →
            </h3>
            <p className="text-gray-400 text-sm">
              Deep dive into system design, flow diagrams, and performance optimization strategies
            </p>
          </Link>

          <Link
            href="/docs/features"
            className="p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-600/30 rounded-lg hover:border-green-500 transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold mb-2 group-hover:text-green-400 transition-colors">
              Features →
            </h3>
            <p className="text-gray-400 text-sm">
              Explore free and premium features, compare plans, and unlock advanced capabilities
            </p>
          </Link>

          <Link
            href="/docs/api"
            className="p-6 bg-gradient-to-br from-orange-600/20 to-yellow-600/20 border border-orange-600/30 rounded-lg hover:border-orange-500 transition-all duration-200 group"
          >
            <h3 className="text-xl font-bold mb-2 group-hover:text-orange-400 transition-colors">
              API Reference →
            </h3>
            <p className="text-gray-400 text-sm">
              Complete API documentation for programmatic control and automation
            </p>
          </Link>
        </div>

        {/* Use Cases */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Perfect For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                emoji: "👨‍💻",
                title: "Development Teams",
                description: "Custom .local or .dev domains for projects without host file modifications"
              },
              {
                emoji: "🏢",
                title: "Small Business",
                description: "Easy-to-remember internal domains with centralized DNS management"
              },
              {
                emoji: "🏠",
                title: "Home Networks",
                description: "Parental controls, device monitoring, and custom smart home domains"
              },
              {
                emoji: "🏫",
                title: "Educational Institutions",
                description: "Manage student access, filter content, and track network usage"
              }
            ].map((useCase, index) => (
              <div
                key={index}
                className="p-5 bg-gray-900 border border-gray-800 rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{useCase.emoji}</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 text-gray-100">{useCase.title}</h3>
                    <p className="text-sm text-gray-400">{useCase.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-6">
            Transform your network&apos;s DNS infrastructure in minutes
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/docs/installation"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Install Now
            </Link>
            <a
              href="https://github.com/nexoral/NexoralDNS"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-700"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
