import type { Metadata } from "next";
import { FadeIn } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "Changelog - NexoralDNS Documentation",
  description: "Version history and changelog for NexoralDNS. See what's new in each release.",
};

const changelog = [
  {
    version: "1.2.0",
    date: "January 15, 2024",
    tag: "Latest",
    tagColor: "green",
    changes: [
      { type: "feature", text: "Added support for wildcard domain blocking (e.g., *.ads.com)" },
      { type: "feature", text: "Introduced \"Staggered Animations\" in the documentation site" },
      { type: "feature", text: "Added dark mode toggle in the dashboard" },
      { type: "improvement", text: "Optimized Redis cache invalidation strategy" },
      { type: "improvement", text: "Reduced Docker image size by 40%" },
      { type: "improvement", text: "Updated upstream DNS providers list" },
    ]
  },
  {
    version: "1.1.0",
    date: "December 20, 2023",
    changes: [
      { type: "feature", text: "Added REST API for programmatic control" },
      { type: "feature", text: "Implemented per-client blocking rules" },
      { type: "feature", text: "Added \"Query Logs\" view in the dashboard" },
      { type: "fix", text: "Fixed an issue where CNAME records were not resolving correctly" },
      { type: "fix", text: "Resolved a memory leak in the DNS service" },
    ]
  },
  {
    version: "1.0.0",
    date: "November 10, 2023",
    tag: "Initial Release",
    tagColor: "blue",
    changes: [
      { type: "feature", text: "Core DNS server with Redis caching" },
      { type: "feature", text: "Web dashboard for management" },
      { type: "feature", text: "Support for A, AAAA, and CNAME records" },
      { type: "feature", text: "Basic domain blocking" },
      { type: "feature", text: "Docker Compose deployment" },
    ]
  },
];

const changeTypeStyles = {
  feature: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", label: "New" },
  improvement: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Improved" },
  fix: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Fixed" },
  breaking: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Breaking" },
};

export default function ChangelogPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-12 py-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Changelog
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Track all changes, improvements, and bug fixes across NexoralDNS releases.
            </p>
          </div>

          {/* Subscribe to Updates */}
          <div className="mb-12 p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Stay Updated</h3>
                <p className="text-sm text-gray-400">Watch the GitHub repo to get notified of new releases</p>
              </div>
              <a
                href="https://github.com/nexoral/NexoralDNS/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-8">
            {changelog.map((release, index) => (
              <div key={release.version} className="relative">
                {/* Connecting line */}
                {index < changelog.length - 1 && (
                  <div className="absolute left-[19px] top-12 w-0.5 h-[calc(100%-2rem)] bg-gradient-to-b from-gray-700 to-transparent hidden sm:block"></div>
                )}

                <div className="flex gap-6">
                  {/* Version indicator */}
                  <div className="hidden sm:flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${release.tag === "Latest" ? "bg-green-500/20 border-2 border-green-500/50" :
                      release.tagColor === "blue" ? "bg-blue-500/20 border-2 border-blue-500/50" :
                        "bg-gray-800 border-2 border-gray-700"
                      }`}>
                      <span className="text-lg">📦</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-gray-700 transition-all duration-300">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <h2 className="text-2xl font-bold text-white">v{release.version}</h2>
                      {release.tag && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${release.tagColor === "green" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                          release.tagColor === "blue" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                            "bg-gray-800 text-gray-400"
                          }`}>
                          {release.tag}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">{release.date}</span>
                    </div>

                    {/* Changes */}
                    <ul className="space-y-3">
                      {release.changes.map((change, i) => {
                        const style = changeTypeStyles[change.type as keyof typeof changeTypeStyles];
                        return (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${style.bg} ${style.border} ${style.text} border`}>
                              {style.label}
                            </span>
                            <span className="text-gray-300">{change.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Older Versions */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Looking for older versions?</p>
            <a
              href="https://github.com/nexoral/NexoralDNS/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all releases on GitHub →
            </a>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
