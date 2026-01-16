import type { Metadata } from "next";
import { FadeIn } from "@/components/MotionWrapper";

export const metadata: Metadata = {
  title: "FAQ - NexoralDNS Documentation",
  description: "Frequently asked questions about NexoralDNS installation, configuration, and usage.",
};

export default function FAQPage() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>Frequently Asked Questions</h1>

          <p className="text-xl text-gray-400">
            Common questions and answers about NexoralDNS.
          </p>

          <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
            <a href="#general" className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 mb-1">General</h3>
              <p className="text-sm text-gray-400">Basic questions about features and usage</p>
            </a>
            <a href="#installation" className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 mb-1">Installation</h3>
              <p className="text-sm text-gray-400">Setup, Docker, and deployment queries</p>
            </a>
            <a href="#configuration" className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 mb-1">Configuration</h3>
              <p className="text-sm text-gray-400">DNS records, blocking, and settings</p>
            </a>
            <a href="#troubleshooting" className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 mb-1">Troubleshooting</h3>
              <p className="text-sm text-gray-400">Common issues and solutions</p>
            </a>
          </div>

          <h2 id="general">General</h2>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">Is NexoralDNS free?</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                Yes! NexoralDNS has a generous free tier that is perfect for home users and developers. We also offer a Premium tier with advanced features like priority support, extended analytics retention, and multi-user access for businesses.
              </p>
            </div>
          </details>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 mt-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">How does it compare to Pi-hole?</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                NexoralDNS is built with modern technologies (Node.js, Redis, MongoDB) focusing on performance and scalability. While Pi-hole is excellent, NexoralDNS offers:
              </p>
              <ul className="mt-2">
                <li>Faster query processing with Redis caching</li>
                <li>Built-in support for high availability (clustering)</li>
                <li>Modern, responsive React-based dashboard</li>
                <li>REST API for programmatic control</li>
                <li>Multi-user support with role-based access</li>
              </ul>
            </div>
          </details>

          <h2 id="installation">Installation</h2>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">Can I run it on a Raspberry Pi?</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                Absolutely! NexoralDNS is lightweight and Docker-compatible. It runs smoothly on Raspberry Pi 3, 4, and 5. We provide ARM64 Docker images specifically for this purpose.
              </p>
            </div>
          </details>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 mt-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">Port 53 is already in use?</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                This is common on Ubuntu/Debian systems where <code>systemd-resolved</code> listens on port 53. You need to disable the system stub resolver:
              </p>
              <pre className="bg-black/50 p-3 rounded-lg mt-2 text-sm overflow-x-auto">
                <code>
                  sudo systemctl stop systemd-resolved
                  <br />
                  sudo systemctl disable systemd-resolved
                </code>
              </pre>
              <p className="mt-2">
                Check our <a href="/docs/installation#troubleshooting">Installation Guide</a> for detailed steps.
              </p>
            </div>
          </details>

          <h2 id="configuration">Configuration</h2>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">How do I block ads?</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                You can block ads in two ways:
              </p>
              <ol className="mt-2">
                <li><strong>Block Lists:</strong> Subscribe to a public ad-blocking list (e.g., StevenBlack) in the "Blocking" section.</li>
                <li><strong>Manual Block:</strong> Add specific domains (e.g., <code>ads.google.com</code>) to your block list manually.</li>
              </ol>
            </div>
          </details>

          <h2 id="troubleshooting">Troubleshooting</h2>

          <details className="group bg-gray-900/30 border border-gray-800 rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-white font-medium">
              <h3 className="text-lg m-0 inline">Dashboard shows "Connection Lost"</h3>
              <span className="shrink-0 rounded-full bg-white/10 p-1.5 text-gray-300 sm:p-3 group-open:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="mt-4 leading-relaxed text-gray-400">
              <p>
                This usually means the API server is not reachable.
              </p>
              <ul className="mt-2">
                <li>Check if the Docker container is running: <code>docker ps</code></li>
                <li>Check logs: <code>docker logs nexoraldns-api</code></li>
                <li>Ensure port 4000 is open and not blocked by a firewall.</li>
              </ul>
            </div>
          </details>
        </div>
      </FadeIn>
    </div>
  );
}
