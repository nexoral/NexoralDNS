'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem { title: string; href: string; }
interface NavSection { section: string; items: NavItem[]; }

const navigation: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { title: 'Home', href: '/' },
    ],
  },
  {
    section: 'Get Started',
    items: [
      { title: 'Getting Started', href: '/docs/getting-started' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'Dashboard', href: '/docs/dashboard' },
    ],
  },
  {
    section: 'Reference',
    items: [
      { title: 'API Reference', href: '/docs/api' },
      { title: 'Architecture', href: '/docs/architecture' },
      { title: 'Features', href: '/docs/features' },
      { title: 'Changelog', href: '/docs/changelog' },
    ],
  },
  {
    section: 'Help',
    items: [
      { title: 'FAQ', href: '/docs/faq' },
      { title: 'Troubleshooting', href: '/docs/troubleshooting' },
      { title: 'Security', href: '/docs/security' },
    ],
  },
  {
    section: 'Project',
    items: [
      { title: 'Contributing', href: '/docs/contributing' },
      { title: 'License', href: '/docs/license' },
      { title: 'Contact', href: '/contact' },
    ],
  },
  {
    section: 'Commands',
    items: [
      { title: 'Install', href: '/docs/commands/install' },
      { title: 'Start', href: '/docs/commands/start' },
      { title: 'Stop', href: '/docs/commands/stop' },
      { title: 'Remove', href: '/docs/commands/remove' },
      { title: 'Update', href: '/docs/commands/update' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Link
        href="/"
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 8px 18px',
          textDecoration: 'none',
        }}
      >
        <span style={{
          width: 34, height: 34, flexShrink: 0,
          filter: 'drop-shadow(0 4px 12px rgba(52,225,212,.45))',
        }}>
          {/* NexoralDNS shield logo */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="34" height="34">
            <defs>
              <linearGradient id="ndLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5b8cff"/>
                <stop offset="100%" stopColor="#34e1d4"/>
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#ndLogo)"/>
            <g transform="translate(4,4)">
              <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </g>
          </svg>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: '#f2f6fb' }}>NexoralDNS</span>
          <span style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 9.5,
            letterSpacing: '.16em',
            color: '#5f6b7d',
            textTransform: 'uppercase',
            marginTop: 3,
          }}>DNS Control Plane</span>
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
        {navigation.map(section => (
          <div key={section.section} style={{ marginTop: 18 }}>
            <div style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 10,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: '#4f5a6e',
              padding: '0 10px 8px',
            }}>{section.section}</div>
            {section.items.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 11px',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 450,
                    color: active ? '#eef3f9' : '#8b98ac',
                    background: active
                      ? 'linear-gradient(90deg,rgba(91,140,255,.14),rgba(52,225,212,.05))'
                      : 'transparent',
                    textDecoration: 'none',
                    transition: 'background .15s ease, color .15s ease',
                    marginBottom: 2,
                  }}
                  className="sidebar-link"
                >
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: active ? '#34e1d4' : '#3a4150',
                    boxShadow: active ? '0 0 8px #34e1d4' : 'none',
                    transition: 'all .15s',
                  }} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 50,
          padding: 12,
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(130,165,220,.18)',
          borderRadius: 12,
          color: '#cdd9e8',
          cursor: 'pointer',
        }}
        className="mobile-toggle"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Desktop sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 272,
        height: '100vh',
        overflowY: 'auto',
        background: 'linear-gradient(180deg,#090c12,#080a10)',
        borderRight: '1px solid rgba(130,165,220,.1)',
        zIndex: 40,
        padding: '22px 16px 40px',
      }} className="desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4,6,10,.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 38,
            }}
          />
          <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: 272,
            height: '100vh',
            overflowY: 'auto',
            background: 'linear-gradient(180deg,#090c12,#080a10)',
            borderRight: '1px solid rgba(130,165,220,.1)',
            zIndex: 39,
            padding: '22px 16px 40px',
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      <style>{`
        .sidebar-link:hover { background: rgba(255,255,255,.045) !important; color: #d7e0ec !important; }
        @media (max-width: 1023px) {
          .desktop-sidebar { display: none !important; }
          .mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}
