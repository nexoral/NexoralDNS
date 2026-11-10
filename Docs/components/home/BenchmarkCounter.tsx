'use client';

import { useEffect, useRef } from 'react';
import { inView, animateCounter, isReducedMotion } from '@/lib/anime';

export default function BenchmarkCounter() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const qpsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;

    return inView(containerRef.current, () => {
      if (qpsRef.current) {
        animateCounter(qpsRef.current, 12746, {
          duration: 1400,
          decimals: 0,
        });
      }
    });
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'relative', borderRadius: 22, padding: '48px 40px',
      background: 'radial-gradient(640px 260px at 50% 0%,rgba(246,179,82,.12),transparent 70%),linear-gradient(180deg,rgba(14,20,30,.9),rgba(8,11,17,.6))',
      border: '1px solid rgba(246,179,82,.28)', textAlign: 'center', overflow: 'hidden',
    }} className="nd-glow">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#f6b352,transparent)' }} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, letterSpacing: '.12em', color: '#f6b352',
          textTransform: 'uppercase',
        }}>Peak throughput · UDP port 53</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em', padding: '2px 9px', borderRadius: 999,
          background: 'rgba(61,220,132,.14)', border: '1px solid rgba(61,220,132,.28)', color: '#74e6a4',
        }}>Go DNS Server</span>
      </div>
      <div
        ref={qpsRef}
        className="qps-stat"
        style={{
          fontSize: 88, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1,
          background: 'linear-gradient(135deg,#f6b352,#ffd580)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}
      >
        12,746
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: '#cdd9e8', letterSpacing: '.06em', marginTop: 6 }}>
        queries / second
      </div>
      <div style={{ marginTop: 10, fontSize: 13.5, color: '#7c8aa0' }}>
        Measured with <b style={{ color: '#bcc8d8' }}>dnsperf</b> against the Go DNS engine — one process, one UDP listener per core share, no external resolver in the path.
      </div>

      {/* Sub-stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 36, flexWrap: 'wrap' }}>
        {[
          { label: 'Avg latency', value: '3.8ms', accent: '#3ddc84' },
          { label: 'Cache hit rate', value: '~98%', accent: '#5b8cff' },
          { label: 'Dropped queries', value: '0', accent: '#34e1d4' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.accent, letterSpacing: '-.02em' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#62718a', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
