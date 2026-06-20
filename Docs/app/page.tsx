import Link from 'next/link';
import CopyCodeBlock from '@/components/CopyCodeBlock';

const INSTALL = 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -';
const START   = 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s start';
const STOP    = 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop';
const REMOVE  = 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s remove';

const pipeline = [
  { t: 'L1', label: 'Redis cache',  tag: 'miss', c: '#f6b352' },
  { t: 'L3', label: 'Block list',   tag: 'pass', c: '#5b8cff' },
  { t: 'L5', label: 'DNS record',   tag: 'pass', c: '#5b8cff' },
  { t: 'L7', label: 'Upstream DNS', tag: 'hit',  c: '#3ddc84' },
];

const svcCmds = [
  { title: 'Start', icon: '▶', flag: 'bash -s start', badgeBg: 'rgba(61,220,132,.12)', badgeFg: '#74e6a4', border: 'rgba(61,220,132,.16)', desc: 'Start NexoralDNS services if they are stopped.', cmd: START, foot: 'Starts all services without reinstalling.' },
  { title: 'Stop',  icon: '■', flag: 'bash -s stop',  badgeBg: 'rgba(246,179,82,.12)', badgeFg: '#f6b352', border: 'rgba(246,179,82,.16)',  desc: 'Stop all NexoralDNS services gracefully.',   cmd: STOP,   foot: 'Stops services without removing the installation.' },
  { title: 'Remove',icon: '✕', flag: 'bash -s remove',badgeBg: 'rgba(255,96,113,.12)', badgeFg: '#ff8a96', border: 'rgba(255,96,113,.16)',  desc: 'Completely uninstall NexoralDNS and all data.', cmd: REMOVE, foot: 'Removes all services, containers, images, and data.' },
];

const transports = [
  { icon: '📡', port: 'UDP :53',  tag: 'Classic', bg: 'rgba(130,165,220,.06)', border: 'rgba(130,165,220,.16)', tagBg: 'rgba(130,165,220,.14)', tagFg: '#93a1b5' },
  { icon: '🔗', port: 'TCP :53',  tag: 'New',     bg: 'rgba(91,140,255,.08)',  border: 'rgba(91,140,255,.32)',  tagBg: 'rgba(91,140,255,.2)',   tagFg: '#9db8ff' },
  { icon: '🔒', port: 'TLS :853', tag: 'New',     bg: 'rgba(52,225,212,.08)', border: 'rgba(52,225,212,.32)', tagBg: 'rgba(52,225,212,.2)',   tagFg: '#6ee9df' },
];

const features = [
  { icon: '🌐', title: 'Custom Domains',     desc: 'Create internal domains like myapp.local without external DNS.' },
  { icon: '📊', title: 'Real-time Analytics',desc: 'Monitor all DNS queries with detailed logs, charts and patterns.' },
  { icon: '🛡️', title: 'Domain Blocking',    desc: 'Block ads, trackers, malware and set up parental controls.' },
  { icon: '⚡', title: 'Ultra Fast',          desc: 'Sub-5ms response times with Redis caching and optimized architecture.' },
  { icon: '🖥️', title: 'Web Dashboard',       desc: 'Beautiful, intuitive dashboard accessible on your local network.' },
  { icon: '🔧', title: 'Easy Setup',          desc: 'One-command Docker install — up and running in minutes.' },
  { icon: '👥', title: 'Multi-device',        desc: 'Manage DNS for every device on your network from one place.' },
  { icon: '🔌', title: 'REST API',            desc: 'Full API access for automation and integration with other tools.' },
  { icon: '📱', title: 'Responsive UI',       desc: 'Manage from any device — desktop, tablet or mobile.' },
];

const usecases = [
  { icon: '👨‍💻', title: 'Developers & Teams', desc: 'Local .dev domains, team collaboration, service discovery.' },
  { icon: '🏢', title: 'Small Businesses',   desc: 'Central management, usage monitoring, security filtering.' },
  { icon: '🏠', title: 'Home Networks',      desc: 'Ad blocking, parental controls, IoT management.' },
  { icon: '🏫', title: 'Education',          desc: 'Content filtering, usage analytics, safe browsing.' },
];

const explore = [
  { icon: '🚀', title: 'Getting Started', path: '/docs/getting-started', href: '/docs/getting-started' },
  { icon: '⚡', title: 'Installation',    path: '/docs/installation',    href: '/docs/installation' },
  { icon: '🖥️', title: 'Dashboard',       path: '/docs/dashboard',       href: '/docs/dashboard' },
  { icon: '🔌', title: 'API Reference',   path: '/docs/api',             href: '/docs/api' },
  { icon: '✨', title: 'Features',        path: '/docs/features',        href: '/docs/features' },
  { icon: '❓', title: 'FAQ',             path: '/docs/faq',             href: '/docs/faq' },
  { icon: '🔧', title: 'Troubleshooting', path: '/docs/troubleshooting', href: '/docs/troubleshooting' },
  { icon: '🧬', title: 'Architecture',    path: '/docs/architecture',    href: '/docs/architecture' },
];

export default function Home() {
  return (
    <>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 56px 0' }} className="home-content">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.15fr .95fr', gap: 54, alignItems: 'center' }} className="hero-grid nd-rise">
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '6px 13px', borderRadius: 999,
              background: 'rgba(61,220,132,.08)', border: '1px solid rgba(61,220,132,.24)',
              fontSize: 12.5, color: '#74e6a4', marginBottom: 26,
            }}>
              <span style={{ position: 'relative', display: 'flex', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#3ddc84' }} className="nd-ring" />
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#3ddc84' }} className="nd-pulse" />
              </span>
              Open-source DNS control plane for local networks
            </div>

            <h1 style={{ margin: 0, fontSize: 54, lineHeight: 1.04, letterSpacing: '-.03em', fontWeight: 700, color: '#f2f6fb' }}>
              Take control of your<br />network&apos;s{' '}
              <span className="nd-shimmer">DNS traffic.</span>
            </h1>

            <p style={{ margin: '22px 0 0', fontSize: 17.5, lineHeight: 1.62, color: '#9aa8bd', maxWidth: 520 }}>
              A powerful, self-hosted DNS management &amp; surveillance system that gives you complete visibility
              and control over every query on your local network.
            </p>

            <div style={{ display: 'flex', gap: 13, marginTop: 32, flexWrap: 'wrap' }}>
              <Link href="/docs/getting-started" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '13px 22px', borderRadius: 11,
                background: 'linear-gradient(135deg,#3ddc84,#1fae63)',
                color: '#05130b', fontWeight: 600, fontSize: 15,
                textDecoration: 'none',
                boxShadow: '0 16px 40px -18px rgba(61,220,132,.8)',
              }}>
                Get started free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a href="https://github.com/nexoral/NexoralDNS" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '13px 20px', borderRadius: 11,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(130,165,220,.18)',
                color: '#dbe4ef', fontWeight: 500, fontSize: 15, textDecoration: 'none',
              }}>
                View on GitHub
              </a>
            </div>

            <div style={{ display: 'flex', gap: 26, marginTop: 34, fontSize: 13, color: '#6c798e', flexWrap: 'wrap' }}>
              <span><b style={{ color: '#cdd9e8', fontWeight: 600 }}>&lt;2ms</b> cached response</span>
              <span><b style={{ color: '#cdd9e8', fontWeight: 600 }}>7-layer</b> query engine</span>
              <span><b style={{ color: '#cdd9e8', fontWeight: 600 }}>100%</b> self-hosted</span>
            </div>
          </div>

          {/* Pipeline widget */}
          <div style={{ position: 'relative', borderRadius: 18, padding: 1, background: 'linear-gradient(160deg,rgba(91,140,255,.4),rgba(52,225,212,.15),transparent)' }} className="nd-float">
            <div style={{ borderRadius: 17, background: 'linear-gradient(180deg,#0b0f17,#080b11)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(130,165,220,.1)' }}>
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#5f6b7d' }}>live query pipeline</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: '#3ddc84' }}>● resolving</span>
              </div>
              <div style={{ padding: '18px 16px', fontFamily: 'var(--font-geist-mono)', fontSize: 12.5 }}>
                <div style={{ color: '#7c8aa0', marginBottom: 14 }}>
                  <span style={{ color: '#3ddc84' }}>$</span> dig google.com @10.0.0.2
                </div>
                {pipeline.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                    <span style={{ width: 46, fontSize: 10, color: '#5f6b7d' }}>{p.t}</span>
                    <span style={{ position: 'relative', width: 9, height: 9, borderRadius: '50%', background: p.c, boxShadow: `0 0 12px ${p.c}`, display: 'block' }} />
                    <span style={{ color: '#bcc8d8' }}>{p.label}</span>
                    <span style={{ marginLeft: 'auto', color: p.c, fontSize: 11 }}>{p.tag}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid rgba(130,165,220,.1)', display: 'flex', justifyContent: 'space-between', color: '#cdd9e8' }}>
                  <span>142.250.x.x</span><span style={{ color: '#3ddc84' }}>NOERROR · 1.4ms</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ONE-COMMAND INSTALL ───────────────────────────────────────── */}
        <section style={{
          marginTop: 60, position: 'relative', borderRadius: 18,
          padding: '30px 30px 26px',
          background: 'linear-gradient(180deg,rgba(91,140,255,.06),rgba(8,11,17,.4))',
          border: '1px solid rgba(130,165,220,.14)',
        }} className="nd-glow">
          <div style={{
            position: 'absolute', top: -13, left: 30,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 13px', borderRadius: 999,
            background: 'linear-gradient(135deg,#3ddc84,#1fae63)',
            color: '#05130b', fontSize: 11.5, fontWeight: 600, letterSpacing: '.02em',
            boxShadow: '0 10px 24px -12px rgba(61,220,132,.9)',
          }}>⚡ One-command install</div>
          <h3 style={{ margin: '6px 0 16px', fontSize: 20, fontWeight: 600, letterSpacing: '-.01em', color: '#eef3f9' }}>
            Up and running in under a minute
          </h3>
          <CopyCodeBlock code={INSTALL} label="install · bash" />
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: '#7c8aa0' }}>
            Automatically installs Docker, downloads the latest version, and starts all services.
          </p>
        </section>

        {/* ── SERVICE COMMANDS ─────────────────────────────────────────── */}
        <section style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {svcCmds.map((c, i) => (
            <div key={i} style={{ borderRadius: 16, padding: 20, background: 'rgba(12,17,26,.6)', border: `1px solid ${c.border}` }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '4px 11px', borderRadius: 999,
                background: c.badgeBg, color: c.badgeFg,
                fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
                textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono)',
              }}>{c.icon} {c.title}</div>
              <p style={{ margin: '13px 0 13px', fontSize: 13.5, color: '#93a1b5', lineHeight: 1.5, minHeight: 40 }}>{c.desc}</p>
              <CopyCodeBlock code={c.cmd} label={c.flag} />
              <p style={{ margin: '11px 0 0', fontSize: 12, color: '#62718a' }}>{c.foot}</p>
            </div>
          ))}
        </section>

        {/* ── WHAT'S NEW ───────────────────────────────────────────────── */}
        <section style={{ marginTop: 80, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '6px 14px', borderRadius: 999,
            background: 'linear-gradient(100deg,rgba(91,140,255,.14),rgba(167,139,250,.14))',
            border: '1px solid rgba(167,139,250,.28)',
            fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, letterSpacing: '.08em', color: '#c4b5fd',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', display: 'block' }} className="nd-pulse" />
            WHAT&apos;S NEW · v3.5.44-stable
          </div>

          <h2 style={{ margin: '20px 0 12px', fontSize: 40, letterSpacing: '-.025em', fontWeight: 700, background: 'linear-gradient(100deg,#5b8cff,#34e1d4 40%,#a78bfa 80%)', backgroundSize: '220% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'ndShimmer 8s linear infinite' }}>
            DNS Protocol Expansion
          </h2>
          <p style={{ maxWidth: 660, margin: '0 auto', fontSize: 16, lineHeight: 1.6, color: '#93a1b5' }}>
            NexoralDNS now speaks all three major DNS transports — plain UDP, reliable TCP, and encrypted TLS — with zero configuration changes.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            {transports.map((t, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '10px 18px', borderRadius: 12,
                background: t.bg, border: `1px solid ${t.border}`,
              }}>
                <span style={{ fontSize: 17 }}>{t.icon}</span>
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: '#dbe4ef', fontWeight: 500 }}>{t.port}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: t.tagBg, color: t.tagFg, fontWeight: 600 }}>{t.tag}</span>
              </div>
            ))}
          </div>

          {/* Proto cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 34, textAlign: 'left' }} className="proto-grid">
            {/* TCP */}
            <div style={{ position: 'relative', borderRadius: 18, padding: 26, background: 'linear-gradient(180deg,rgba(91,140,255,.06),rgba(8,11,17,.4))', border: '1px solid rgba(91,140,255,.24)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#5b8cff,transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: '#eef3f9' }}>DNS over TCP</h3>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', padding: '3px 8px', borderRadius: 6, background: '#5b8cff', color: '#06121a' }}>NEW</span>
              </div>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, color: '#5b8cff', marginBottom: 14 }}>Port 53 TCP · RFC 1035 §4.2.2 · RFC 7766</div>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: '#9aa8bd' }}>Full TCP transport for DNS — required for responses over 512 bytes, DNSSEC chains, and zone transfers. Handles 2-byte length-prefix framing automatically.</p>
              {[
                ['Large response support', 'DNSSEC, TXT, many-answer records'],
                ['RFC 7766 idle timeout', '30s keepalive, auto-disconnects stale clients'],
                ['Singleton architecture', 'shared single-flight cache across connections'],
                ['Zero-config startup', 'starts alongside UDP automatically'],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: '#5b8cff', flexShrink: 0, marginTop: 1 }}>▸</span>
                  <span style={{ color: '#aeb9ca' }}><b style={{ color: '#dbe4ef', fontWeight: 600 }}>{k}</b> — {v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <CopyCodeBlock code="dig +tcp google.com @10.x.x.x" label="test" prompt={false} />
              </div>
            </div>

            {/* DoT */}
            <div style={{ position: 'relative', borderRadius: 18, padding: 26, background: 'linear-gradient(180deg,rgba(52,225,212,.06),rgba(8,11,17,.4))', border: '1px solid rgba(52,225,212,.24)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#34e1d4,transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: '#eef3f9' }}>DNS over TLS</h3>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', padding: '3px 8px', borderRadius: 6, background: '#34e1d4', color: '#06121a' }}>NEW</span>
              </div>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, color: '#34e1d4', marginBottom: 14 }}>Port 853 · RFC 7858 · DoT</div>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: '#9aa8bd' }}>Encrypted DNS transport using TLS 1.2+ to prevent eavesdropping and spoofing. A self-signed certificate is auto-generated via openssl on first boot.</p>
              {[
                ['TLS 1.2+ enforced', 'TLS 1.3 preferred per RFC 7858 §3.1'],
                ['Auto cert generation', 'self-signed via openssl, saved to /etc/nexoral/cert'],
                ['Shared across restarts', 'cert persisted on disk'],
                ['Same 7-layer pipeline', 'identical block, cache & upstream logic'],
              ].map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', fontSize: 13 }}>
                  <span style={{ color: '#34e1d4', flexShrink: 0, marginTop: 1 }}>▸</span>
                  <span style={{ color: '#aeb9ca' }}><b style={{ color: '#dbe4ef', fontWeight: 600 }}>{k}</b> — {v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <CopyCodeBlock code="kdig -p 853 @10.x.x.x +tls google.com" label="test" prompt={false} />
              </div>
            </div>
          </div>

          <p style={{ margin: '22px auto 0', maxWidth: 720, fontSize: 13.5, color: '#7c8aa0', lineHeight: 1.55, borderTop: '1px solid rgba(130,165,220,.1)', paddingTop: 18 }}>
            All three transports share the same <b style={{ color: '#bcc8d8' }}>7-layer query processor</b>, Redis cache, block-list engine, and analytics pipeline — consistent behaviour regardless of how a client connects.
          </p>
        </section>

        {/* ── PROBLEM / SOLUTION ───────────────────────────────────────── */}
        <section style={{ marginTop: 84 }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', color: '#34e1d4', textTransform: 'uppercase' }}>Why NexoralDNS</div>
            <h2 style={{ margin: '10px 0 0', fontSize: 34, letterSpacing: '-.02em', fontWeight: 700, color: '#eef3f9' }}>From DNS chaos to total control</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="problem-grid">
            <div style={{ borderRadius: 18, padding: 28, background: 'linear-gradient(180deg,rgba(255,96,113,.06),rgba(8,11,17,.3))', border: '1px solid rgba(255,96,113,.2)' }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 18, color: '#ff8a96', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(255,96,113,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✕</span>The problem
              </h3>
              {['No visibility into DNS requests', "Can't create custom internal domains", 'Host file edits on every device', 'No way to block malicious domains', 'Third-party DNS providers track your data'].map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '8px 0', fontSize: 14, color: '#b3bdcc', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ color: '#ff6071', flexShrink: 0 }}>✕</span>{p}
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 18, padding: 28, background: 'linear-gradient(180deg,rgba(61,220,132,.06),rgba(8,11,17,.3))', border: '1px solid rgba(61,220,132,.2)' }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 18, color: '#74e6a4', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(61,220,132,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</span>The solution
              </h3>
              {['Real-time dashboard of all DNS queries', 'Create custom domains with one click', 'Network-wide DNS settings', 'Block ads, trackers & malicious domains', "100% self-hosted — your data stays yours"].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '8px 0', fontSize: 14, color: '#c3cdda', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ color: '#3ddc84', flexShrink: 0 }}>✓</span>{s}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section style={{ marginTop: 84 }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', color: '#34e1d4', textTransform: 'uppercase' }}>Capabilities</div>
            <h2 style={{ margin: '10px 0 0', fontSize: 34, letterSpacing: '-.02em', fontWeight: 700, color: '#eef3f9' }}>Powerful features, simple control</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="features-grid">
            {features.map((f, i) => (
              <div key={i} style={{ borderRadius: 16, padding: 22, background: 'rgba(12,17,26,.5)', border: '1px solid rgba(130,165,220,.1)', transition: 'all .2s' }} className="card-hover">
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(91,140,255,.1)', border: '1px solid rgba(91,140,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ margin: '0 0 7px', fontSize: 15.5, fontWeight: 600, color: '#eef3f9' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#8b98ac' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── USE CASES ────────────────────────────────────────────────── */}
        <section style={{ marginTop: 84 }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', color: '#34e1d4', textTransform: 'uppercase' }}>Perfect for</div>
            <h2 style={{ margin: '10px 0 0', fontSize: 34, letterSpacing: '-.02em', fontWeight: 700, color: '#eef3f9' }}>Built for every network</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="usecases-grid">
            {usecases.map((u, i) => (
              <div key={i} style={{ borderRadius: 16, padding: 22, background: 'linear-gradient(180deg,rgba(14,20,30,.7),rgba(8,11,17,.4))', border: '1px solid rgba(130,165,220,.1)' }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{u.icon}</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#eef3f9' }}>{u.title}</h3>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#8b98ac' }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── LAN WARNING ──────────────────────────────────────────────── */}
        <section style={{ marginTop: 60, borderRadius: 18, padding: 30, background: 'linear-gradient(135deg,rgba(255,96,113,.08),rgba(246,179,82,.05))', border: '1px solid rgba(255,96,113,.26)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: '#ffb3bb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>LAN use only
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#c3aeb0' }}>
            NexoralDNS is designed exclusively for Local Area Network use. Never expose it to the public internet.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="lan-grid">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#ff8a96', textTransform: 'uppercase', marginBottom: 10 }}>Do not</div>
              {['Host on cloud platforms', 'Expose to the public internet', 'Use as a public DNS resolver'].map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 13.5, color: '#b3bdcc' }}>
                  <span style={{ color: '#ff6071', flexShrink: 0 }}>✕</span>{d}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: '#74e6a4', textTransform: 'uppercase', marginBottom: 10 }}>Do</div>
              {['Install on a local machine', 'Configure your router to use it', 'Keep it within your private network'].map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '5px 0', fontSize: 13.5, color: '#c3cdda' }}>
                  <span style={{ color: '#3ddc84', flexShrink: 0 }}>✓</span>{d}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EXPLORE DOCS ─────────────────────────────────────────────── */}
        <section style={{ marginTop: 84 }}>
          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.2em', color: '#34e1d4', textTransform: 'uppercase' }}>Documentation</div>
            <h2 style={{ margin: '10px 0 0', fontSize: 34, letterSpacing: '-.02em', fontWeight: 700, color: '#eef3f9' }}>Explore the docs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="explore-grid">
            {explore.map((e, i) => (
              <Link key={i} href={e.href} style={{
                display: 'flex', flexDirection: 'column', gap: 9,
                borderRadius: 14, padding: 18,
                background: 'rgba(12,17,26,.5)', border: '1px solid rgba(130,165,220,.1)',
                textDecoration: 'none', transition: 'all .18s',
              }} className="explore-card">
                <span style={{ fontSize: 21 }}>{e.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#dbe4ef' }}>{e.title}</span>
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, color: '#5f6b7d' }}>{e.path}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section style={{
          margin: '90px 0 0', borderRadius: 22, padding: 54, textAlign: 'center',
          background: 'radial-gradient(600px 300px at 50% 0%,rgba(91,140,255,.16),transparent 70%),linear-gradient(180deg,rgba(14,20,30,.8),rgba(8,11,17,.6))',
          border: '1px solid rgba(130,165,220,.16)',
        }}>
          <h2 style={{ margin: 0, fontSize: 38, letterSpacing: '-.025em', fontWeight: 700, color: '#eef3f9' }}>Ready to take control?</h2>
          <p style={{ margin: '16px auto 0', maxWidth: 540, fontSize: 16, color: '#9aa8bd', lineHeight: 1.6 }}>
            Join thousands of users who have transformed their network&apos;s DNS infrastructure with NexoralDNS.
          </p>
          <div style={{ display: 'flex', gap: 13, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
            <Link href="/docs/getting-started" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '13px 24px', borderRadius: 11,
              background: 'linear-gradient(135deg,#3ddc84,#1fae63)',
              color: '#05130b', fontWeight: 600, fontSize: 15, textDecoration: 'none',
              boxShadow: '0 16px 40px -18px rgba(61,220,132,.8)',
            }}>Start free</Link>
            <Link href="/contact" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '13px 22px', borderRadius: 11,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(130,165,220,.18)',
              color: '#dbe4ef', fontWeight: 500, fontSize: 15, textDecoration: 'none',
            }}>Contact us</Link>
          </div>
        </section>

      </div>

      <style>{`
        @media (max-width: 1023px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-grid > div:last-child { display: none; }
        }
        @media (max-width: 767px) {
          .home-content { padding: 40px 24px 0 !important; }
          .home-content h1 { font-size: 36px !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .usecases-grid { grid-template-columns: 1fr 1fr !important; }
          .explore-grid { grid-template-columns: 1fr 1fr !important; }
          .proto-grid { grid-template-columns: 1fr !important; }
          .problem-grid { grid-template-columns: 1fr !important; }
          .lan-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 479px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .usecases-grid { grid-template-columns: 1fr !important; }
          .explore-grid { grid-template-columns: 1fr 1fr !important; }
        }
        .card-hover:hover { border-color: rgba(52,225,212,.3) !important; background: rgba(14,20,30,.8) !important; }
        .explore-card:hover { border-color: rgba(52,225,212,.34) !important; transform: translateY(-2px); }
      `}</style>
    </>
  );
}
