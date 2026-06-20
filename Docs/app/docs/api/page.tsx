import Link from 'next/link';

export default function ApiPage() {
  return (
    <>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '52px 56px 0', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} className="api-content">

        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#34e1d4', marginBottom: 28 }}>
          Reference
        </div>

        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: 'linear-gradient(135deg,rgba(91,140,255,.14),rgba(52,225,212,.08))',
          border: '1px solid rgba(91,140,255,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 46, marginBottom: 36,
          boxShadow: '0 0 0 8px rgba(91,140,255,.06), 0 24px 60px -20px rgba(91,140,255,.4)',
        }}>🔌</div>

        <h1 style={{
          margin: '0 0 16px', fontSize: 56, fontWeight: 800,
          letterSpacing: '-.03em', lineHeight: 1.04,
          background: 'linear-gradient(120deg,#5b8cff,#34e1d4 45%,#a78bfa 80%)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text',
          backgroundClip: 'text', color: 'transparent',
          animation: 'ndShimmer 7s linear infinite',
        }}>Coming Soon</h1>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '6px 16px', borderRadius: 999,
          background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.28)',
          fontFamily: 'var(--font-geist-mono)', fontSize: 12, letterSpacing: '.08em', color: '#c4b5fd',
          marginBottom: 28,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', display: 'block', animation: 'ndPulse 1.6s ease-in-out infinite' }} />
          API Reference · In Development
        </div>

        <p style={{ margin: '0 auto 40px', maxWidth: 560, fontSize: 17, lineHeight: 1.65, color: '#9aa8bd' }}>
          The complete REST API reference is being documented. It will cover all endpoints for DNS records, rewrites, blocking rules, analytics, and user plan management.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 48, width: '100%', maxWidth: 680 }} className="api-cards">
          {[
            { icon: '🌐', title: 'DNS Records',       desc: 'Create, read, update and delete DNS records via REST.' },
            { icon: '🔀', title: 'Rewrites & Blocks', desc: 'Manage rerouting rules and blocking policies programmatically.' },
            { icon: '📊', title: 'Analytics',          desc: 'Query logs, performance metrics, and top domains.' },
          ].map((c, i) => (
            <div key={i} style={{ borderRadius: 14, padding: 20, background: 'rgba(12,17,26,.5)', border: '1px solid rgba(130,165,220,.1)' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#dbe4ef', marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8b98ac' }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 16, padding: '22px 28px', background: 'rgba(91,140,255,.06)', border: '1px solid rgba(91,140,255,.2)', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 14, color: '#8b98ac', marginBottom: 16, lineHeight: 1.6 }}>
            In the meantime, check out the existing documentation or open a GitHub issue to request API access.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/docs/architecture" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#5b8cff,#34e1d4)', color: '#06121a', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>View Architecture</Link>
            <a href="https://github.com/nexoral/NexoralDNS/issues" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(130,165,220,.18)', color: '#dbe4ef', fontWeight: 500, fontSize: 13.5, textDecoration: 'none' }}>GitHub Issues</a>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>

      <style>{`
        @media (max-width: 767px) {
          .api-content { padding: 40px 24px 0 !important; }
          .api-content h1 { font-size: 38px !important; }
          .api-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
