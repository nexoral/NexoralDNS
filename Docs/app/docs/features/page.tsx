import Link from 'next/link';

export default function FeaturesPage() {
  return (
    <>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '52px 56px 0', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} className="feat-content">

        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#34e1d4', marginBottom: 28 }}>
          Reference
        </div>

        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: 'linear-gradient(135deg,rgba(167,139,250,.14),rgba(52,225,212,.08))',
          border: '1px solid rgba(167,139,250,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 46, marginBottom: 36,
          boxShadow: '0 0 0 8px rgba(167,139,250,.06), 0 24px 60px -20px rgba(167,139,250,.4)',
        }}>✨</div>

        <h1 style={{
          margin: '0 0 16px', fontSize: 56, fontWeight: 800,
          letterSpacing: '-.03em', lineHeight: 1.04,
          background: 'linear-gradient(120deg,#a78bfa,#34e1d4 45%,#5b8cff 80%)',
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
          Features & Pricing · Being Finalized
        </div>

        <p style={{ margin: '0 auto 40px', maxWidth: 560, fontSize: 17, lineHeight: 1.65, color: '#9aa8bd' }}>
          The full feature comparison and pricing tiers are being finalized. Check back soon for the complete Free vs Premium matrix.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 48, width: '100%', maxWidth: 680 }} className="feat-cards">
          {[
            { icon: '🌐', title: 'DNS over UDP/TCP/TLS', desc: 'All three transports — classic, reliable, encrypted.' },
            { icon: '🛡️', title: 'Domain Blocking',      desc: 'Ads, trackers, malware, and custom block rules.' },
            { icon: '📊', title: 'Real-time Analytics',  desc: 'Live query logs, performance metrics, patterns.' },
          ].map((c, i) => (
            <div key={i} style={{ borderRadius: 14, padding: 20, background: 'rgba(12,17,26,.5)', border: '1px solid rgba(130,165,220,.1)' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#dbe4ef', marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8b98ac' }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 16, padding: '22px 28px', background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 14, color: '#8b98ac', marginBottom: 16, lineHeight: 1.6 }}>
            Want to know what&apos;s included in each tier? Check the architecture overview or get in touch.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/docs/architecture" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#a78bfa,#34e1d4)', color: '#06121a', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' }}>View Architecture</Link>
            <Link href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(130,165,220,.18)', color: '#dbe4ef', fontWeight: 500, fontSize: 13.5, textDecoration: 'none' }}>Contact Us</Link>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>

      <style>{`
        @media (max-width: 767px) {
          .feat-content { padding: 40px 24px 0 !important; }
          .feat-content h1 { font-size: 38px !important; }
          .feat-cards { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
