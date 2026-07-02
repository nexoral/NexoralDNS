'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const pages = [
  { key: '/', label: 'Home', group: 'Overview', icon: '🏠' },
  { key: '/docs/getting-started', label: 'Getting Started', group: 'Get Started', icon: '🚀' },
  { key: '/docs/installation', label: 'Installation', group: 'Get Started', icon: '⚡' },
  { key: '/docs/dashboard', label: 'Dashboard', group: 'Get Started', icon: '🖥️' },
  { key: '/docs/api', label: 'API Reference', group: 'Reference', icon: '🔌' },
  { key: '/docs/architecture', label: 'Architecture', group: 'Reference', icon: '🧬' },
  { key: '/docs/features', label: 'Features', group: 'Reference', icon: '✨' },
  { key: '/docs/changelog', label: 'Changelog', group: 'Reference', icon: '📋' },
  { key: '/docs/faq', label: 'FAQ', group: 'Help', icon: '❓' },
  { key: '/docs/troubleshooting', label: 'Troubleshooting', group: 'Help', icon: '🔧' },
  { key: '/docs/security', label: 'Security', group: 'Help', icon: '🔒' },
  { key: '/docs/contributing', label: 'Contributing', group: 'Project', icon: '🤝' },
  { key: '/docs/license', label: 'License', group: 'Project', icon: '📄' },
  { key: '/contact', label: 'Contact', group: 'Project', icon: '✉️' },
  { key: '/docs/commands/install', label: 'Install', group: 'Commands', icon: '▶' },
  { key: '/docs/commands/start', label: 'Start', group: 'Commands', icon: '▶' },
  { key: '/docs/commands/stop', label: 'Stop', group: 'Commands', icon: '■' },
  { key: '/docs/commands/remove', label: 'Remove', group: 'Commands', icon: '✕' },
  { key: '/docs/commands/update', label: 'Update', group: 'Commands', icon: '↻' },
];

export default function Header({ version }: { version: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const cur = pages.find(p => p.key === pathname) ?? pages[0];

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOpen(v => !v);
      setQ('');
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const results = pages.filter(p => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.label.toLowerCase().includes(s) || p.group.toLowerCase().includes(s);
  });

  return (
    <>
      <header className="nd-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 40px',
        height: 60,
        background: 'rgba(8,10,16,.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(130,165,220,.09)',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#7c8aa0' }}>
          <span style={{ color: '#5f6b7d' }}>{cur.group}</span>
          <span style={{ color: '#39414f' }}>/</span>
          <span style={{ color: '#cdd9e8', fontWeight: 500 }}>{cur.label}</span>
        </div>

        {/* Search */}
        <button
          onClick={() => { setOpen(true); setQ(''); }}
          className="nd-search-btn"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 34,
            padding: '0 12px',
            borderRadius: 9,
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(130,165,220,.13)',
            color: '#8b98ac',
            fontFamily: 'var(--font-geist-sans)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <span className="nd-search-text">Search docs</span>
          <span className="nd-search-kbd" style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 11,
            color: '#5f6b7d',
            border: '1px solid rgba(130,165,220,.16)',
            borderRadius: 5,
            padding: '1px 6px',
          }}>⌘K</span>
        </button>

        {/* GitHub */}
        <a
          href="https://github.com/nexoral/NexoralDNS"
          target="_blank"
          rel="noopener noreferrer"
          className="nd-github-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 34,
            padding: '0 13px',
            borderRadius: 9,
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(130,165,220,.13)',
            color: '#cdd9e8',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'all .15s',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1.27a11 11 0 0 0-3.48 21.46c.55.09.73-.24.73-.53v-1.85c-3.03.66-3.67-1.46-3.67-1.46-.5-1.27-1.21-1.6-1.21-1.6-1-.68.07-.66.07-.66 1.09.08 1.66 1.12 1.66 1.12.97 1.65 2.54 1.17 3.16.9.1-.7.38-1.18.69-1.45-2.42-.27-4.96-1.21-4.96-5.38 0-1.19.42-2.16 1.12-2.92-.11-.28-.49-1.39.11-2.9 0 0 .92-.29 3 1.12a10.4 10.4 0 0 1 5.46 0c2.08-1.41 3-1.12 3-1.12.6 1.51.22 2.62.11 2.9.7.76 1.12 1.73 1.12 2.92 0 4.18-2.55 5.1-4.98 5.37.39.34.74 1 .74 2.03v3.01c0 .29.18.63.74.52A11 11 0 0 0 12 1.27" />
          </svg>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5 }}>v{version.replace(/-stable$/, '')}</span>
        </a>
      </header>

      {/* Command Palette */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(4,6,10,.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '14vh',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(620px, 92vw)',
            borderRadius: 16,
            background: '#0b0f17',
            border: '1px solid rgba(130,165,220,.2)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,.8)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 18px',
              borderBottom: '1px solid rgba(130,165,220,.1)',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5f6b7d" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                autoFocus
                placeholder="Search documentation…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e7eef6',
                  fontFamily: 'var(--font-geist-sans)',
                  fontSize: 15,
                }}
              />
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 10.5,
                color: '#5f6b7d',
                border: '1px solid rgba(130,165,220,.16)',
                borderRadius: 5,
                padding: '2px 7px',
              }}>ESC</span>
            </div>
            <div style={{ maxHeight: '52vh', overflowY: 'auto', padding: 8 }}>
              {results.map(r => (
                <Link
                  key={r.key}
                  href={r.key}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '11px 13px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'background .12s',
                  }}
                  className="palette-item"
                >
                  <span style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(130,165,220,.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                  }}>{r.icon}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, color: '#dbe4ef', fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, color: '#5f6b7d' }}>{r.group}</span>
                  </span>
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6b7d" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .palette-item:hover { background: rgba(91,140,255,.1); }
        @media (max-width: 1023px) {
          .nd-header { padding: 0 16px 0 72px !important; gap: 12px !important; }
        }
        @media (max-width: 599px) {
          .nd-search-text { display: none !important; }
          .nd-search-kbd { display: none !important; }
          .nd-header { padding: 0 12px 0 68px !important; gap: 8px !important; }
        }
        @media (max-width: 479px) {
          .nd-github-btn { display: none !important; }
        }
      `}</style>
    </>
  );
}
