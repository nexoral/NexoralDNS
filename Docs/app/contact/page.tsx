import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact - NexoralDNS Documentation",
  description: "Get in touch with the NexoralDNS team. Find support resources, report issues, and connect with the developer.",
};

export default function ContactPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Contact Us
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Have questions or need help? We&apos;re here for you. Choose the best way to reach us below.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Email */}
          <a
            href="mailto:connect@ankan.in"
            className="group p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl hover:border-blue-500/40 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Email</h3>
                <p className="text-blue-400 font-mono text-sm mb-2">connect@ankan.in</p>
                <p className="text-gray-400 text-sm">Best for general inquiries and support requests</p>
              </div>
            </div>
          </a>

          {/* GitHub Issues */}
          <a
            href="https://github.com/nexoral/NexoralDNS/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl hover:border-gray-600 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">GitHub Issues</h3>
                <p className="text-gray-300 font-mono text-sm mb-2">nexoral/NexoralDNS</p>
                <p className="text-gray-400 text-sm">Report bugs and request features</p>
              </div>
            </div>
          </a>

          {/* GitHub Discussions */}
          <a
            href="https://github.com/nexoral/NexoralDNS/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-2xl hover:border-purple-500/40 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Discussions</h3>
                <p className="text-purple-400 font-mono text-sm mb-2">Community Forum</p>
                <p className="text-gray-400 text-sm">Ask questions and share ideas with the community</p>
              </div>
            </div>
          </a>

          {/* Website */}
          <a
            href="https://nexoral.in"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-2xl hover:border-green-500/40 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Website</h3>
                <p className="text-green-400 font-mono text-sm mb-2">nexoral.in</p>
                <p className="text-gray-400 text-sm">Visit our official website for more info</p>
              </div>
            </div>
          </a>
        </div>

        {/* Before You Contact */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Before You Reach Out</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "📚",
                title: "Check the Docs",
                description: "Most questions are answered in our documentation",
                link: "/docs/getting-started",
                linkText: "Read Docs"
              },
              {
                icon: "❓",
                title: "Browse FAQ",
                description: "Common questions and their answers",
                link: "/docs/faq",
                linkText: "View FAQ"
              },
              {
                icon: "🔧",
                title: "Troubleshooting",
                description: "Solutions to common issues",
                link: "/docs/troubleshooting",
                linkText: "Get Help"
              }
            ].map((item, index) => (
              <Link
                key={index}
                href={item.link}
                className="group p-5 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all duration-300"
              >
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                <span className="text-sm text-blue-400 group-hover:text-blue-300 transition-colors">
                  {item.linkText} →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Response Time */}
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl text-center">
          <h3 className="text-xl font-bold mb-2">Expected Response Time</h3>
          <p className="text-gray-400 mb-4">
            We typically respond within <span className="text-blue-400 font-semibold">24-48 hours</span> for email inquiries.
          </p>
          <p className="text-sm text-gray-500">
            For urgent issues, please open a GitHub issue with the &quot;urgent&quot; label.
          </p>
        </div>

        {/* Developer Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            NexoralDNS is developed and maintained by{" "}
            <a
              href="https://ankan.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ankan
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
