export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">About NexoralDNS</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Advanced DNS Management & Surveillance System for Local Area Networks.
              Enterprise-grade DNS features for your home or business.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/nexoral/NexoralDNS" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="https://nexoral.in" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Official Website
                </a>
              </li>
              <li>
                <a href="/docs/contributing" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Contributing
                </a>
              </li>
              <li>
                <a href="/docs/security" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Security Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="/docs/troubleshooting" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Troubleshooting
                </a>
              </li>
              <li>
                <a href="https://github.com/nexoral/NexoralDNS/issues" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  Report Issues
                </a>
              </li>
              <li>
                <a href="/docs/api" className="text-sm text-gray-400 hover:text-blue-400 transition-colors">
                  API Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} NexoralDNS Team. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Made with ❤️ by the NexoralDNS Team
          </p>
        </div>
      </div>
    </footer>
  );
}
