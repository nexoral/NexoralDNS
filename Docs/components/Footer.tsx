import Link from 'next/link';

const navCols = [
  {
    title: 'Documentation',
    links: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'Installation',    href: '/docs/installation' },
      { label: 'API Reference',   href: '/docs/api' },
      { label: 'FAQ',             href: '/docs/faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub',       href: 'https://github.com/nexoral/NexoralDNS', external: true },
      { label: 'Changelog',    href: '/docs/changelog' },
      { label: 'Contributing', href: '/docs/contributing' },
      { label: 'License',      href: '/docs/license' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Troubleshooting',  href: '/docs/troubleshooting' },
      { label: 'Report Issues',    href: 'https://github.com/nexoral/NexoralDNS/issues', external: true },
      { label: 'Contact Us',       href: '/contact' },
      { label: 'Official Website', href: 'https://nexoral.in', external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="ft-root">
      <div className="ft-wrap">

        {/* ── Top row: brand left · nav right ── */}
        <div className="ft-top">

          {/* Brand */}
          <div className="ft-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="ftLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5b8cff" />
                    <stop offset="100%" stopColor="#34e1d4" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#ftLogo)" />
                <g transform="translate(4,4)">
                  <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </g>
              </svg>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#f2f6fb' }}>NexoralDNS</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7c8aa0' }}>
              Advanced DNS Management &amp; Surveillance System for Local Area Networks.
            </p>
          </div>

          {/* Nav columns */}
          <div className="ft-nav">
            {navCols.map(col => (
              <div key={col.title}>
                <div className="ft-nav-head">{col.title}</div>
                {col.links.map(l => (
                  l.external ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="ft-link">
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href} className="ft-link">
                      {l.label}
                    </Link>
                  )
                ))}
              </div>
            ))}
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="ft-bottom">
          <span>© 2024 NexoralDNS · MIT License</span>
          <span className="ft-mono">Built by Ankan · ankan.in</span>
        </div>

      </div>

      <style>{`
        .ft-root {
          margin-top: 80px;
          border-top: 1px solid rgba(130,165,220,.1);
          background: rgba(8,10,16,.5);
        }
        .ft-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: 48px 56px 30px;
        }

        /* Top row */
        .ft-top {
          display: flex;
          gap: 48px;
        }
        .ft-brand {
          width: 34%;
          flex-shrink: 0;
        }
        .ft-nav {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .ft-nav-head {
          font-family: var(--font-geist-mono);
          font-size: 10px;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #4f5a6e;
          margin-bottom: 13px;
        }
        .ft-link {
          display: block;
          font-size: 13px;
          color: #8b98ac;
          text-decoration: none;
          padding: 4px 0;
          transition: color .15s;
        }
        .ft-link:hover { color: #cdd9e8; }

        /* Bottom bar */
        .ft-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 36px;
          padding-top: 22px;
          border-top: 1px solid rgba(130,165,220,.08);
          font-size: 12.5px;
          color: #62718a;
        }
        .ft-mono { font-family: var(--font-geist-mono); }

        /* ── Tablet (no sidebar) ── */
        @media (max-width: 1023px) {
          .ft-root  { margin-top: 60px; }
          .ft-wrap  { padding: 40px 32px 28px; }
          .ft-brand { width: 36%; }
          .ft-top   { gap: 32px; }
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .ft-root  { margin-top: 48px; }
          .ft-wrap  { padding: 36px 20px 24px; }
          .ft-top   { flex-direction: column; gap: 28px; }
          .ft-brand { width: 100%; }
          .ft-nav   { width: 100%; }
        }

        /* ── XS ── */
        @media (max-width: 479px) {
          .ft-root  { margin-top: 36px; }
          .ft-wrap  { padding: 28px 16px 20px; }
          .ft-nav   { grid-template-columns: 1fr 1fr; gap: 16px; }
          .ft-bottom { flex-direction: column; align-items: center; gap: 6px; text-align: center; }
        }
      `}</style>
    </footer>
  );
}
