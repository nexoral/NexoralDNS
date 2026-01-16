import type { Metadata } from "next";
import Link from "next/link";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "Getting Started - NexoralDNS Documentation",
  description: "Quick start guide to get NexoralDNS up and running in minutes. Install, configure, and start managing your network's DNS.",
};

export default function GettingStartedPage() {
  const installCommand = "curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -";

  const steps = [
    {
      number: 1,
      title: "Install NexoralDNS",
      description: "Run the one-line installer to set up NexoralDNS on your machine. The script will automatically install Docker if needed.",
      content: (
        <div className="mt-4">
          <CopyCodeBlock code={installCommand} />
          <p className="text-sm text-gray-500 mt-3">
            This will download and start all required services automatically.
          </p>
        </div>
      )
    },
    {
      number: 2,
      title: "Access the Dashboard",
      description: "Open your browser and navigate to the NexoralDNS dashboard to start configuring your DNS server.",
      content: (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">Dashboard URL:</p>
          <code className="text-blue-400 text-lg">http://localhost:4000</code>
          <p className="text-sm text-gray-500 mt-3">
            Or use your machine&apos;s IP address to access from other devices: <code className="text-gray-400">http://192.168.x.x:4000</code>
          </p>
        </div>
      )
    },
    {
      number: 3,
      title: "Configure Your Router",
      description: "Point your router's DNS settings to your NexoralDNS server to enable network-wide DNS management.",
      content: (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <ol className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-semibold">1.</span>
                Log into your router&apos;s admin panel (usually 192.168.1.1 or 192.168.0.1)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-semibold">2.</span>
                Find DNS settings (under LAN, DHCP, or Network settings)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-semibold">3.</span>
                Set Primary DNS to your NexoralDNS server IP
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-semibold">4.</span>
                Save and restart your router
              </li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            Alternatively, you can configure individual devices to use NexoralDNS in their network settings.
          </p>
        </div>
      )
    },
    {
      number: 4,
      title: "Create Your First Custom Domain",
      description: "Test your setup by creating a custom domain that points to a device on your network.",
      content: (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-gray-300 mb-3">In the dashboard:</p>
            <ol className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-semibold">→</span>
                Go to <span className="text-white">Domains</span> section
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-semibold">→</span>
                Click <span className="text-white">Add Domain</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-semibold">→</span>
                Enter domain: <code className="text-blue-400">myserver.local</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-semibold">→</span>
                Point to IP: <code className="text-blue-400">192.168.1.100</code>
              </li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            Now try pinging <code className="text-gray-400">myserver.local</code> from any device on your network!
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-400 mb-6">
              <span>⏱️</span>
              5 minute setup
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Getting Started
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Get NexoralDNS up and running in just a few minutes. Follow these simple steps to take control of your network&apos;s DNS.
            </p>
          </div>
        </FadeIn>

        {/* Prerequisites */}
        <FadeIn delay={0.2}>
          <div className="mb-12 p-6 bg-gray-900/50 border border-gray-800 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">📋</span>
              Prerequisites
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Linux, macOS, or Windows", desc: "Any OS that runs Docker" },
                { name: "2GB+ RAM", desc: "Recommended minimum" },
                { name: "Terminal/Shell access", desc: "To run commands" },
                { name: "Network access", desc: "LAN connectivity" }
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-400">
                  <span className="text-green-400">✓</span>
                  <div>
                    <span className="text-white">{req.name}</span>
                    <span className="text-sm text-gray-500 ml-2">- {req.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Docker will be installed automatically if not present on your system.
            </p>
          </div>
        </FadeIn>

        {/* Steps */}
        <StaggerContainer className="space-y-8 mb-12">
          {steps.map((step) => (
            <StaggerItem
              key={step.number}
              className="relative pl-12 sm:pl-16"
            >
              {/* Step number */}
              <div className="absolute left-0 top-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                {step.number}
              </div>

              {/* Connecting line */}
              {step.number < steps.length && (
                <div className="absolute left-[15px] sm:left-[19px] top-10 w-0.5 h-[calc(100%+2rem)] bg-gradient-to-b from-blue-600/50 to-transparent"></div>
              )}

              <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
                {step.content}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Success Message */}
        <FadeIn delay={0.4}>
          <div className="p-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-2xl mb-12">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-2">You&apos;re All Set!</h3>
                <p className="text-gray-300 mb-4">
                  Congratulations! NexoralDNS is now managing your network&apos;s DNS. All DNS queries from your devices will now be logged, cached, and can be customized from the dashboard.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/docs/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Explore Dashboard →
                  </Link>
                  <Link
                    href="/docs/features"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    View All Features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Next Steps */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">What&apos;s Next?</h2>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { href: "/docs/configuration", icon: "⚙️", title: "Configuration", desc: "Customize NexoralDNS settings" },
              { href: "/docs/features", icon: "✨", title: "Explore Features", desc: "Discover what you can do" },
              { href: "/docs/api", icon: "🔌", title: "API Reference", desc: "Automate with the REST API" },
              { href: "/docs/troubleshooting", icon: "🔧", title: "Troubleshooting", desc: "Solve common issues" },
              { href: "/docs/security", icon: "🔒", title: "Security", desc: "Best practices for security" },
              { href: "/docs/faq", icon: "❓", title: "FAQ", desc: "Common questions answered" }
            ].map((link, i) => (
              <StaggerItem key={i}>
                <Link
                  href={link.href}
                  className="group block h-full p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all duration-300"
                >
                  <span className="text-2xl mb-2 block">{link.icon}</span>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{link.title}</h3>
                  <p className="text-sm text-gray-500">{link.desc}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </div>
  );
}
