'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { animate } from '@/lib/anime';

interface NavItem {
  title: string;
  href: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    section: 'Getting Started',
    items: [
      { title: 'Overview', href: '/' },
      { title: 'Getting Started', href: '/docs/getting-started' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'Configuration', href: '/docs/configuration' },
    ],
  },
  {
    section: 'Core Guides',
    items: [
      { title: 'Web Dashboard', href: '/docs/dashboard' },
      { title: 'Features & Modules', href: '/docs/features' },
      { title: 'REST API Reference', href: '/docs/api' },
      { title: 'MCP Server (AI)', href: '/docs/mcp-server' },
      { title: 'System Architecture', href: '/docs/architecture' },
    ],
  },
  {
    section: 'CLI Commands',
    items: [
      { title: 'nexoraldns install', href: '/docs/commands/install' },
      { title: 'nexoraldns start', href: '/docs/commands/start' },
      { title: 'nexoraldns stop', href: '/docs/commands/stop' },
      { title: 'nexoraldns update', href: '/docs/commands/update' },
      { title: 'nexoraldns pack', href: '/docs/commands/pack' },
      { title: 'nexoraldns remove', href: '/docs/commands/remove' },
    ],
  },
  {
    section: 'Reference & Help',
    items: [
      { title: 'FAQ', href: '/docs/faq' },
      { title: 'Troubleshooting', href: '/docs/troubleshooting' },
      { title: 'Security Policy', href: '/docs/security' },
      { title: 'Changelog', href: '/docs/changelog' },
      { title: 'Contributing', href: '/docs/contributing' },
      { title: 'License', href: '/docs/license' },
      { title: 'Contact', href: '/contact' },
    ],
  },
];

interface SidebarContentProps {
  pathname: string;
  onClose?: () => void;
}

function SidebarContent({ pathname, onClose }: SidebarContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Link
        href="/"
        onClick={onClose}
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
                  onClick={onClose}
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
                    borderLeft: active ? '2px solid #34e1d4' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'background .18s ease, color .18s ease, border-left .18s ease',
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
                    transition: 'all .18s',
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
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mobileOpen && mobileDrawerRef.current && backdropRef.current) {
      animate(backdropRef.current, {
        opacity: [0, 1],
        duration: 250,
        ease: 'outQuad',
      });
      animate(mobileDrawerRef.current, {
        translateX: [-272, 0],
        duration: 300,
        ease: 'outQuad',
      });
    }
  }, [mobileOpen]);

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
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            ref={backdropRef}
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4,6,10,.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 38,
            }}
          />
          <aside
            ref={mobileDrawerRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: 272,
              height: '100vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg,#090c12,#080a10)',
              borderRight: '1px solid rgba(130,165,220,.14)',
              zIndex: 39,
              padding: '22px 16px 40px',
              boxShadow: '10px 0 35px -10px rgba(0,0,0,.7)',
            }}
          >
            <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
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
