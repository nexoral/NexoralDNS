'use client';

import { useState, useEffect, useRef } from 'react';
import { animate, isReducedMotion } from '@/lib/anime';

type FlowState = 'idle' | 'safe_to_dns' | 'safe_to_upstream' | 'safe_resolved' | 'threat_to_dns' | 'threat_blocked';

export default function NetworkFlow() {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [logText, setLogText] = useState('LAN traffic monitor active. Click a test below or watch live queries.');
  const [logTone, setLogTone] = useState<'neutral' | 'success' | 'danger'>('neutral');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-run periodic flow demonstrations when idle
  useEffect(() => {
    if (isReducedMotion()) return;

    let mounted = true;
    let cycle = 0;

    const interval = setInterval(() => {
      if (!mounted) return;
      if (cycle % 2 === 0) {
        runSafeQuery();
      } else {
        runThreatQuery();
      }
      cycle++;
    }, 5500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const runSafeQuery = () => {
    setFlowState('safe_to_dns');
    setLogTone('neutral');
    setLogText('Phone issues lookup: dig google.com ➔ NexoralDNS Server...');

    setTimeout(() => {
      setFlowState('safe_to_upstream');
      setLogText('NexoralDNS verifies cache & requests upstream over encrypted TLS...');

      setTimeout(() => {
        setFlowState('safe_resolved');
        setLogTone('success');
        setLogText('Resolved 142.250.190.46 ➔ Verified NOERROR in 1.2ms to Phone');

        setTimeout(() => {
          setFlowState('idle');
        }, 1800);
      }, 700);
    }, 700);
  };

  const runThreatQuery = () => {
    setFlowState('threat_to_dns');
    setLogTone('neutral');
    setLogText('Phone issues lookup: dig analytics.ad-tracker.io ➔ NexoralDNS...');

    setTimeout(() => {
      setFlowState('threat_blocked');
      setLogTone('danger');
      setLogText('BLOCKED: Matched rule in memory. Dropped at gateway (0.0.0.0). Upstream never contacted.');

      setTimeout(() => {
        setFlowState('idle');
      }, 2000);
    }, 700);
  };

  useEffect(() => {
    if (containerRef.current && !isReducedMotion()) {
      animate(containerRef.current, {
        opacity: [0, 1],
        translateY: [14, 0],
        duration: 550,
        ease: 'outQuad',
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        borderRadius: 24,
        background: 'linear-gradient(180deg,#0a0e18,#060910)',
        border: '1px solid rgba(148,163,184,.18)',
        boxShadow: '0 28px 70px -20px rgba(0,0,0,.9), 0 0 0 1px rgba(59,130,246,.12) inset',
        overflow: 'hidden',
        fontFamily: 'var(--font-geist-sans),system-ui,sans-serif',
        minHeight: 450,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* ── Top Telemetry Header ── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(148,163,184,.12)',
        background: 'rgba(15,23,42,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: flowState === 'threat_blocked' ? '#ef4444' : '#10b981',
            boxShadow: flowState === 'threat_blocked' ? '0 0 10px #ef4444' : '0 0 10px #10b981',
          }} className="nd-pulse" />
          <span style={{
            fontFamily: 'var(--font-geist-mono)', fontSize: 11.5,
            letterSpacing: '.14em', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 600,
          }}>
            LIVE DNS TRAFFIC FLOW
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-geist-mono)', fontSize: 11,
          color: '#38bdf8', padding: '3px 10px', borderRadius: 6,
          background: 'rgba(56,189,248,.12)', border: '1px solid rgba(56,189,248,.25)',
        }}>
          LAN: 192.168.1.0/24
        </div>
      </div>

      {/* ── Main Flow Stage: Phone ➔ NexoralDNS ➔ Upstream ── */}
      <div style={{ padding: '30px 24px', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

        {/* The 3 Flow Nodes with Spacious Gap */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 75px 1.4fr 75px 1.1fr', alignItems: 'center', gap: 8 }} className="flow-nodes">

          {/* Node 1: Phone Device */}
          <div style={{
            borderRadius: 16, padding: '20px 14px',
            background: 'rgba(15,23,42,.75)', border: '1px solid rgba(148,163,184,.2)',
            textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,.5)',
          }}>
            {/* Phone SVG */}
            <div style={{
              width: 42, height: 66, borderRadius: 10, margin: '0 auto 10px',
              border: '2px solid rgba(148,163,184,.4)', background: '#0a0f1d',
              padding: '5px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ width: 12, height: 2, background: 'rgba(148,163,184,.4)', borderRadius: 2, margin: '0 auto' }} />
              <div style={{
                flex: 1, margin: '4px 0', borderRadius: 6,
                background: 'rgba(37,99,235,.15)', border: '1px solid rgba(59,130,246,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>
                📱
              </div>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(148,163,184,.3)', margin: '0 auto' }} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>Your Phone</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
              192.168.1.50
            </div>
          </div>

          {/* Wire 1: Phone ➔ Server */}
          <div style={{ position: 'relative', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', height: 2.5,
              background: flowState.startsWith('threat')
                ? '#ef4444'
                : flowState.startsWith('safe')
                  ? '#3b82f6'
                  : 'rgba(148,163,184,.2)',
              transition: 'background .25s ease',
            }} />
            {/* Animated packet dot */}
            {flowState === 'safe_to_dns' && (
              <span style={{
                position: 'absolute', width: 10, height: 10, borderRadius: '50%',
                background: '#38bdf8', boxShadow: '0 0 12px #38bdf8',
              }} className="nd-pulse" />
            )}
            {flowState === 'threat_to_dns' && (
              <span style={{
                position: 'absolute', width: 10, height: 10, borderRadius: '50%',
                background: '#ef4444', boxShadow: '0 0 12px #ef4444',
              }} className="nd-pulse" />
            )}
          </div>

          {/* Node 2: NexoralDNS Server */}
          <div style={{
            borderRadius: 18, padding: '22px 16px',
            background: flowState === 'threat_blocked'
              ? 'linear-gradient(180deg,rgba(220,38,38,.16),rgba(15,23,42,.9))'
              : 'linear-gradient(180deg,rgba(37,99,235,.16),rgba(15,23,42,.9))',
            border: flowState === 'threat_blocked'
              ? '1px solid rgba(239,68,68,.5)'
              : '1px solid rgba(59,130,246,.45)',
            textAlign: 'center',
            boxShadow: flowState === 'threat_blocked' ? '0 14px 35px rgba(220,38,38,.35)' : '0 14px 35px rgba(37,99,235,.25)',
            transition: 'all .25s ease',
          }}>
            {/* Server Shield Icon */}
            <div style={{
              width: 50, height: 50, borderRadius: 14, margin: '0 auto 10px',
              background: flowState === 'threat_blocked' ? '#dc2626' : '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: flowState === 'threat_blocked' ? '0 0 20px rgba(220,38,38,.55)' : '0 0 20px rgba(37,99,235,.45)',
              transition: 'all .25s ease',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26">
                <path fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                  d="M16 4l10 4v7c0 6.5-4.5 12.5-10 15C10.5 27.5 6 21.5 6 15V8l10-4z" />
                {flowState === 'threat_blocked' ? (
                  <path fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M12 12l8 8M20 12l-8 8" />
                ) : (
                  <path fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M11 16l3 3 7-7" />
                )}
              </svg>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#f8fafc' }}>NexoralDNS Server</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: '#38bdf8', marginTop: 3 }}>
              192.168.1.1 · :53
            </div>

            {/* Live Block Badge */}
            {flowState === 'threat_blocked' ? (
              <div style={{
                marginTop: 10, padding: '4px 10px', borderRadius: 5,
                background: '#dc2626', color: '#fff', fontSize: 10.5, fontWeight: 700,
                fontFamily: 'var(--font-geist-mono)', display: 'inline-block',
                boxShadow: '0 4px 12px rgba(220,38,38,.5)',
              }}>
                ✕ BLOCKED (0.0.0.0)
              </div>
            ) : flowState === 'safe_resolved' ? (
              <div style={{
                marginTop: 10, padding: '4px 10px', borderRadius: 5,
                background: '#059669', color: '#fff', fontSize: 10.5, fontWeight: 700,
                fontFamily: 'var(--font-geist-mono)', display: 'inline-block',
                boxShadow: '0 4px 12px rgba(5,150,105,.5)',
              }}>
                ✓ VERIFIED NOERROR
              </div>
            ) : (
              <div style={{
                marginTop: 10, padding: '3px 9px', borderRadius: 5,
                background: 'rgba(148,163,184,.12)', color: '#94a3b8', fontSize: 10,
                fontFamily: 'var(--font-geist-mono)', display: 'inline-block',
              }}>
                INSPECTING
              </div>
            )}
          </div>

          {/* Wire 2: Server ➔ Upstream */}
          <div style={{ position: 'relative', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', height: 2.5,
              background: flowState === 'safe_to_upstream'
                ? '#38bdf8'
                : flowState === 'safe_resolved'
                  ? '#10b981'
                  : 'rgba(148,163,184,.15)',
              transition: 'background .25s ease',
            }} />
            {/* Animated packet dot */}
            {flowState === 'safe_to_upstream' && (
              <span style={{
                position: 'absolute', width: 10, height: 10, borderRadius: '50%',
                background: '#38bdf8', boxShadow: '0 0 12px #38bdf8',
              }} className="nd-pulse" />
            )}
            {/* Block indicator */}
            {flowState === 'threat_blocked' && (
              <span style={{
                position: 'absolute', fontSize: 10.5, color: '#ef4444', fontWeight: 700,
                fontFamily: 'var(--font-geist-mono)', background: 'rgba(220,38,38,.12)',
                border: '1px solid rgba(220,38,38,.3)', padding: '2px 6px', borderRadius: 4,
              }}>
                0 LEAK
              </span>
            )}
          </div>

          {/* Node 3: Upstream Internet */}
          <div style={{
            borderRadius: 16, padding: '20px 14px',
            background: 'rgba(15,23,42,.75)', border: '1px solid rgba(148,163,184,.2)',
            textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,.5)',
          }}>
            {/* Globe SVG */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, margin: '8px auto 12px',
              background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#60a5fa" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
              </svg>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>Upstream</div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
              DoT / TLS :853
            </div>
          </div>

        </div>

        {/* ── Real-Time Console Status Readout ── */}
        <div style={{
          marginTop: 22, padding: '12px 16px', borderRadius: 10,
          background: '#040711', border: '1px solid rgba(148,163,184,.16)',
          fontFamily: 'var(--font-geist-mono)', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: logTone === 'danger' ? '#ef4444' : logTone === 'success' ? '#10b981' : '#38bdf8', fontWeight: 700 }}>$</span>
          <span style={{
            color: logTone === 'danger' ? '#fca5a5' : logTone === 'success' ? '#6ee7b7' : '#cbd5e1',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {logText}
          </span>
        </div>

        {/* ── Interactive Test Flow Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button
            onClick={runSafeQuery}
            disabled={flowState !== 'idle'}
            style={{
              padding: '11px 14px', borderRadius: 9,
              background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)',
              color: '#6ee7b7', fontSize: 12.5, fontWeight: 600,
              cursor: flowState === 'idle' ? 'pointer' : 'default',
              transition: 'all .15s ease',
              fontFamily: 'var(--font-geist-mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
            className="flow-btn"
          >
            <span>⚡</span> Test Safe Query
          </button>

          <button
            onClick={runThreatQuery}
            disabled={flowState !== 'idle'}
            style={{
              padding: '11px 14px', borderRadius: 9,
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              color: '#fca5a5', fontSize: 12.5, fontWeight: 600,
              cursor: flowState === 'idle' ? 'pointer' : 'default',
              transition: 'all .15s ease',
              fontFamily: 'var(--font-geist-mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
            className="flow-btn"
          >
            <span>🛡️</span> Test Ad/Threat Block
          </button>
        </div>

      </div>

      <style>{`
        .flow-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.15);
        }
        @media (max-width: 599px) {
          .flow-nodes { grid-template-columns: 1fr !important; gap: 12px !important; }
        }
      `}</style>
    </div>
  );
}
