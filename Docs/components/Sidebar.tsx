'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon?: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    section: 'Getting Started',
    items: [
      { title: 'Home', href: '/', icon: '🏠' },
      { title: 'Quick Start', href: '/docs/getting-started', icon: '🚀' },
      { title: 'Installation', href: '/docs/installation', icon: '⚡' },
      { title: 'Configuration', href: '/docs/configuration', icon: '⚙️' },
    ]
  },
  {
    section: 'Using NexoralDNS',
    items: [
      { title: 'Dashboard Guide', href: '/docs/dashboard', icon: '🖥️' },
      { title: 'Features', href: '/docs/features', icon: '✨' },
      { title: 'API Reference', href: '/docs/api', icon: '🔌' },
      { title: 'Architecture', href: '/docs/architecture', icon: '🏗️' },
    ]
  },
  {
    section: 'Commands',
    items: [
      { title: 'Install', href: '/docs/commands/install', icon: '📥' },
      { title: 'Start', href: '/docs/commands/start', icon: '▶️' },
      { title: 'Stop', href: '/docs/commands/stop', icon: '⏹️' },
      { title: 'Update', href: '/docs/commands/update', icon: '🔄' },
      { title: 'Remove', href: '/docs/commands/remove', icon: '🗑️' },
    ]
  },
  {
    section: 'Resources',
    items: [
      { title: 'FAQ', href: '/docs/faq', icon: '❓' },
      { title: 'Troubleshooting', href: '/docs/troubleshooting', icon: '🔧' },
      { title: 'Security', href: '/docs/security', icon: '🔒' },
      { title: 'Changelog', href: '/docs/changelog', icon: '📋' },
    ]
  },
  {
    section: 'Community',
    items: [
      { title: 'Contributing', href: '/docs/contributing', icon: '🤝' },
      { title: 'Contact', href: '/contact', icon: '📧' },
      { title: 'License', href: '/docs/license', icon: '📄' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
        aria-label="Toggle menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-black/40 backdrop-blur-2xl
          border-r border-white/10
          transform transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6">
            <Link href="/" className="block group">
              <div className="mb-4">
                <h1 className="text-2xl font-black tracking-tighter mb-1">
                  <span className="text-white">NEXORAL</span>
                  <span className="text-blue-500">DNS</span>
                </h1>
                <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
                Documentation Portal
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[10px] font-bold uppercase tracking-wide">
                  Stable
                </span>
                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[10px] font-mono">
                  v3.3.37
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-thin">
            {navigation.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg
                            transition-all duration-200 group
                            ${isActive
                              ? 'bg-white/10 text-white border border-white/20'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          <span className={`text-base transition-transform ${isActive ? '' : 'group-hover:scale-110'}`}>
                            {item.icon}
                          </span>
                          <span className="text-sm font-medium flex-1">{item.title}</span>
                          {isActive && (
                            <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <a
              href="https://github.com/nexoral/NexoralDNS"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white">
                  GitHub
                </div>
                <div className="text-[10px] text-gray-500 font-mono truncate">
                  nexoral/NexoralDNS
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
