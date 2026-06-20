import Link from 'next/link';

const cols = [
  {
    title: 'Documentation',
    links: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'FAQ', href: '/docs/faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: 'https://github.com/nexoral/NexoralDNS', external: true },
      { label: 'Changelog', href: '/docs/changelog' },
      { label: 'Contributing', href: '/docs/contributing' },
      { label: 'License', href: '/docs/license' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Troubleshooting', href: '/docs/troubleshooting' },
      { label: 'Report Issues', href: 'https://github.com/nexoral/NexoralDNS/issues', external: true },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Official Website', href: 'https://nexoral.in', external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ marginTop: 96, borderTop: '1px solid rgba(130,165,220,.1)', background: 'rgba(8,10,16,.5)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 56px 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 36 }}
          className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="ndFooterLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5b8cff"/>
                    <stop offset="100%" stopColor="#34e1d4"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#ndFooterLogo)"/>
                <g transform="translate(4,4)">
                  <path fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </g>
              </svg>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#f2f6fb' }}>NexoralDNS</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7c8aa0', maxWidth: 280 }}>
              Advanced DNS Management &amp; Surveillance System for Local Area Networks.
            </p>
          </div>

          {/* Nav cols */}
          {cols.map(col => (
            <div key={col.title}>
              <div style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 10,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: '#4f5a6e',
                marginBottom: 13,
              }}>{col.title}</div>
              {col.links.map(l => (
                l.external ? (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', fontSize: 13, color: '#8b98ac', textDecoration: 'none', padding: '4px 0', transition: 'color .15s' }}
                    className="footer-link"
                  >{l.label}</a>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    style={{ display: 'block', fontSize: 13, color: '#8b98ac', textDecoration: 'none', padding: '4px 0', transition: 'color .15s' }}
                    className="footer-link"
                  >{l.label}</Link>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 36,
          paddingTop: 22,
          borderTop: '1px solid rgba(130,165,220,.08)',
          fontSize: 12.5,
          color: '#62718a',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span>© 2024 NexoralDNS · MIT License</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)' }}>Built by Ankan · ankan.in</span>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: #cdd9e8 !important; }
        @media (max-width: 767px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 479px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
