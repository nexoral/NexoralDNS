import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900/50 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <h3 className="text-xl font-bold">
                <span className="text-white">NEXORAL</span>
                <span className="text-blue-500">DNS</span>
              </h3>
              <div className="h-0.5 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mt-2"></div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Advanced DNS Management & Surveillance System for Local Area Networks.
            </p>
          </div>

          {/* Documentation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-4">Documentation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/getting-started" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/docs/installation" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Installation
                </Link>
              </li>
              <li>
                <Link href="/docs/configuration" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Configuration
                </Link>
              </li>
              <li>
                <Link href="/docs/api" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs/faq" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/nexoral/NexoralDNS" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/docs/changelog" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/docs/contributing" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Contributing
                </Link>
              </li>
              <li>
                <Link href="/docs/license" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  License
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/docs/troubleshooting" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Troubleshooting
                </Link>
              </li>
              <li>
                <a href="https://github.com/nexoral/NexoralDNS/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Report Issues
                </a>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="https://nexoral.in" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Official Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} NexoralDNS. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/nexoral/NexoralDNS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="mailto:connect@ankan.in"
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
