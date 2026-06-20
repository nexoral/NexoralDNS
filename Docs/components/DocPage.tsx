'use client';

import { useState } from 'react';
import Link from 'next/link';
import CopyCodeBlock from './CopyCodeBlock';

/* ── Block type definitions ─────────────────────────────────────────── */
export type Block =
  | { type: 'h'; title: string; eyebrow?: string; sub?: string }
  | { type: 'p'; text: string }
  | { type: 'code'; code: string; label?: string; prompt?: boolean }
  | { type: 'callout'; tone: 'info' | 'success' | 'warn' | 'danger' | 'tip'; title: string; text: string }
  | { type: 'steps'; steps: Step[] }
  | { type: 'table'; head: string[]; rows: TableRow[]; grid: string }
  | { type: 'cards'; items: Card[]; cols?: number }
  | { type: 'list'; variant: 'check' | 'cross' | 'dot'; items: string[] }
  | { type: 'kv'; items: { k: string; v: string }[] }
  | { type: 'matrix'; rows: [string, string, string][]; heading?: string }
  | { type: 'timeline'; versions: Version[] }
  | { type: 'faq'; items: FAQItem[]; heading?: string }
  | { type: 'divider' }
  | { type: 'next'; title: string; items: LinkCard[]; cols?: number }
  | { type: 'linkCards'; items: LinkCard[]; cols?: number };

interface Step { title: string; text?: string; code?: string; label?: string; prompt?: boolean; bullets?: string[] }
interface TableRow { key: string; cells: string[] }
interface Card { icon?: string; title: string; desc: string }
interface Version {
  ver: string; date: string; tag?: string;
  changes: [string, string][];
}
interface FAQItem { q: string; a: string; code?: string; prompt?: boolean }
interface LinkCard { icon?: string; title: string; href?: string }

export interface DocPageProps {
  group: string;
  title: string;
  badge?: string;
  intro: string;
  blocks: Block[];
}

/* ── Tone palette ───────────────────────────────────────────────────── */
const tones = {
  info:    { bg: 'rgba(91,140,255,.07)',  border: 'rgba(91,140,255,.24)',  fg: '#9db8ff',  icon: 'ℹ️' },
  success: { bg: 'rgba(61,220,132,.07)',  border: 'rgba(61,220,132,.24)',  fg: '#74e6a4',  icon: '✅' },
  warn:    { bg: 'rgba(246,179,82,.08)',  border: 'rgba(246,179,82,.26)',  fg: '#f6c47a',  icon: '⚠️' },
  danger:  { bg: 'rgba(255,96,113,.08)', border: 'rgba(255,96,113,.26)', fg: '#ff8a96',  icon: '⛔' },
  tip:     { bg: 'rgba(52,225,212,.07)', border: 'rgba(52,225,212,.24)', fg: '#6ee9df',  icon: '💡' },
};

const changeKinds: Record<string, [string, string]> = {
  New:      ['rgba(91,140,255,.16)', '#9db8ff'],
  Improved: ['rgba(52,225,212,.16)', '#6ee9df'],
  Fixed:    ['rgba(61,220,132,.16)', '#74e6a4'],
};

const listMark = {
  check: { mark: '✓', color: '#3ddc84' },
  cross: { mark: '✕', color: '#ff6071' },
  dot:   { mark: '▸', color: '#5b8cff' },
};

/* ── Sub-renderers ──────────────────────────────────────────────────── */
function Heading({ b }: { b: Extract<Block, { type: 'h' }> }) {
  return (
    <div style={{ marginTop: 42 }}>
      {b.eyebrow && (
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 10.5,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: '#5b8cff',
          marginBottom: 8,
        }}>{b.eyebrow}</div>
      )}
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 650, letterSpacing: '-.02em', color: '#eef3f9' }}>{b.title}</h2>
      {b.sub && <p style={{ margin: '8px 0 0', fontSize: 14.5, color: '#8b98ac', lineHeight: 1.6 }}>{b.sub}</p>}
    </div>
  );
}

function Steps({ b }: { b: Extract<Block, { type: 'steps' }> }) {
  return (
    <div style={{ marginTop: 26 }}>
      {b.steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 18, paddingBottom: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#5b8cff,#34e1d4)',
              color: '#06121a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15,
              boxShadow: '0 8px 20px -10px rgba(52,225,212,.8)',
            }}>{i + 1}</div>
            {i < b.steps.length - 1 && (
              <div style={{
                width: 2, flex: 1, minHeight: 14,
                background: 'linear-gradient(#34e1d4,rgba(52,225,212,.05))',
                margin: '6px 0',
              }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 22 }}>
            <h3 style={{ margin: '6px 0 6px', fontSize: 16.5, fontWeight: 600, color: '#eef3f9' }}>{s.title}</h3>
            {s.text && <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6, color: '#9aa8bd' }}>{s.text}</p>}
            {s.code && (
              <div style={{ marginBottom: s.bullets ? 12 : 0 }}>
                <CopyCodeBlock code={s.code} label={s.label ?? 'bash'} prompt={s.prompt ?? true} />
              </div>
            )}
            {s.bullets && s.bullets.map((bu, bi) => (
              <div key={bi} style={{ display: 'flex', gap: 9, padding: '4px 0', fontSize: 13.5, color: '#a7b3c4' }}>
                <span style={{ color: '#34e1d4' }}>▸</span>{bu}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Table({ b }: { b: Extract<Block, { type: 'table' }> }) {
  return (
    <div style={{
      marginTop: 20,
      border: '1px solid rgba(130,165,220,.12)',
      borderRadius: 13,
      overflow: 'hidden',
      background: 'rgba(12,17,26,.4)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: b.grid,
        gap: 14,
        padding: '11px 18px',
        background: 'rgba(255,255,255,.02)',
        borderBottom: '1px solid rgba(130,165,220,.12)',
      }}>
        {b.head.map((h, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 10.5,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: '#5f6b7d',
          }}>{h}</span>
        ))}
      </div>
      {b.rows.map((row, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: b.grid,
          gap: 14,
          padding: '11px 18px',
          borderTop: '1px solid rgba(130,165,220,.06)',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12.5, color: '#6ee9df', fontWeight: 500 }}>{row.key}</span>
          {row.cells.map((cell, ci) => (
            <span key={ci} style={{ fontSize: 13, color: '#aeb9ca' }}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Cards({ b }: { b: Extract<Block, { type: 'cards' }> }) {
  const cols = b.cols ?? 2;
  return (
    <div style={{
      marginTop: 20,
      display: 'grid',
      gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`,
      gap: 14,
    }} className="responsive-cards">
      {b.items.map((c, i) => (
        <div key={i} style={{
          borderRadius: 14,
          padding: 18,
          background: 'rgba(12,17,26,.5)',
          border: '1px solid rgba(130,165,220,.1)',
          transition: 'border-color .2s',
        }} className="card-hover">
          {c.icon && <div style={{ fontSize: 21, marginBottom: 11 }}>{c.icon}</div>}
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#eef3f9' }}>{c.title}</h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#8b98ac' }}>{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

function BulletList({ b }: { b: Extract<Block, { type: 'list' }> }) {
  const { mark, color } = listMark[b.variant];
  return (
    <div style={{ marginTop: 16 }}>
      {b.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 11, padding: '6px 0', fontSize: 14.5, lineHeight: 1.55, color: '#aeb9ca' }}>
          <span style={{ color, flexShrink: 0, fontWeight: 700 }}>{mark}</span>
          {item}
        </div>
      ))}
    </div>
  );
}

function KV({ b }: { b: Extract<Block, { type: 'kv' }> }) {
  return (
    <div style={{ marginTop: 18, borderRadius: 13, border: '1px solid rgba(130,165,220,.12)', overflow: 'hidden' }}>
      {b.items.map((kv, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 18,
          padding: '13px 18px',
          borderTop: i === 0 ? 'none' : '1px solid rgba(130,165,220,.07)',
          background: 'rgba(12,17,26,.3)',
          flexWrap: 'wrap',
        }}>
          <span style={{ flexShrink: 0, width: 200, fontWeight: 600, color: '#dbe4ef', fontSize: 14 }}>{kv.k}</span>
          <span style={{ fontSize: 13.5, color: '#9aa8bd', lineHeight: 1.55 }}>{kv.v}</span>
        </div>
      ))}
    </div>
  );
}

function Matrix({ b }: { b: Extract<Block, { type: 'matrix' }> }) {
  const colOf = (v: string) => {
    if (!v) return '#62718a';
    if (v.includes('✕')) return '#7d5a62';
    if (v.includes('✓')) return '#74e6a4';
    return '#cdd9e8';
  };
  return (
    <div style={{ marginTop: 20 }}>
      {b.heading && (
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 11,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: '#5b8cff',
          margin: '14px 0 10px',
        }}>{b.heading}</div>
      )}
      <div style={{ border: '1px solid rgba(130,165,220,.12)', borderRadius: 13, overflow: 'hidden', background: 'rgba(12,17,26,.4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr .8fr .8fr', gap: 14, padding: '11px 18px', background: 'rgba(255,255,255,.02)', borderBottom: '1px solid rgba(130,165,220,.12)' }}>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f6b7d' }}>Feature</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f6b7d' }}>Free</span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#74e6a4' }}>Premium</span>
        </div>
        {b.rows.map(([label, free, prem], i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.7fr .8fr .8fr', gap: 14, padding: '12px 18px', borderTop: '1px solid rgba(130,165,220,.06)', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, color: '#cdd9e8' }}>{label}</span>
            <span style={{ fontSize: 13, color: colOf(free), fontWeight: 500 }}>{free}</span>
            <span style={{ fontSize: 13, color: colOf(prem), fontWeight: 500 }}>{prem}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ b }: { b: Extract<Block, { type: 'timeline' }> }) {
  return (
    <div style={{ marginTop: 24 }}>
      {b.versions.map((v, vi) => (
        <div key={vi} style={{ display: 'flex', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: vi === 0 ? '#34e1d4' : '#3a4150',
              boxShadow: vi === 0 ? '0 0 0 4px rgba(52,225,212,.16)' : '0 0 0 4px rgba(58,65,80,.2)',
              marginTop: 6,
            }} />
            {vi < b.versions.length - 1 && (
              <div style={{ width: 2, flex: 1, minHeight: 20, background: 'linear-gradient(rgba(130,165,220,.3),rgba(130,165,220,.04))', margin: '8px 0' }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#eef3f9', fontFamily: 'var(--font-geist-mono)' }}>{v.ver}</h3>
              {v.tag && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
                  padding: '3px 9px', borderRadius: 6,
                  background: v.tag === 'LATEST' ? 'rgba(61,220,132,.18)' : 'rgba(167,139,250,.18)',
                  color: v.tag === 'LATEST' ? '#74e6a4' : '#c4b5fd',
                }}>{v.tag}</span>
              )}
              <span style={{ fontSize: 13, color: '#62718a' }}>{v.date}</span>
            </div>
            <div style={{ marginTop: 14, borderRadius: 13, border: '1px solid rgba(130,165,220,.1)', background: 'rgba(12,17,26,.4)', overflow: 'hidden' }}>
              {v.changes.map(([kind, text], ci) => {
                const [bg, fg] = changeKinds[kind] ?? changeKinds.New;
                return (
                  <div key={ci} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderTop: ci === 0 ? 'none' : '1px solid rgba(130,165,220,.06)', fontSize: 13.5, lineHeight: 1.55, color: '#aeb9ca' }}>
                    <span style={{ flexShrink: 0, fontFamily: 'var(--font-geist-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', padding: '2px 8px', borderRadius: 5, height: 'fit-content', marginTop: 1, background: bg, color: fg }}>{kind}</span>
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQ({ b }: { b: Extract<Block, { type: 'faq' }> }) {
  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {b.heading && (
        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5b8cff', marginBottom: 2 }}>{b.heading}</div>
      )}
      {b.items.map((f, i) => (
        <details key={i} style={{ borderRadius: 13, border: '1px solid rgba(130,165,220,.12)', background: 'rgba(12,17,26,.45)', overflow: 'hidden' }}>
          <summary style={{ padding: '16px 18px', fontSize: 15, fontWeight: 600, color: '#dbe4ef', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#34e1d4', fontSize: 18 }}>›</span>{f.q}
          </summary>
          <div style={{ padding: '0 18px 16px 42px', fontSize: 14, lineHeight: 1.65, color: '#9aa8bd' }}>{f.a}</div>
          {f.code && (
            <div style={{ padding: '0 18px 16px 42px' }}>
              <CopyCodeBlock code={f.code} label="bash" prompt={f.prompt ?? false} />
            </div>
          )}
        </details>
      ))}
    </div>
  );
}

function Next({ b }: { b: Extract<Block, { type: 'next' }> }) {
  const cols = b.cols ?? 3;
  return (
    <div style={{
      marginTop: 30,
      borderRadius: 16,
      padding: 22,
      background: 'radial-gradient(400px 200px at 50% 0%,rgba(91,140,255,.1),transparent 70%),rgba(12,17,26,.5)',
      border: '1px solid rgba(130,165,220,.14)',
    }}>
      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: '#34e1d4', marginBottom: 14 }}>{b.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 11 }} className="responsive-next">
        {b.items.map((c, i) => (
          <Link
            key={i}
            href={c.href ?? '#'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              borderRadius: 11,
              padding: '13px 14px',
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(130,165,220,.1)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all .15s',
            }}
            className="next-link"
          >
            {c.icon && <span style={{ fontSize: 17 }}>{c.icon}</span>}
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#dbe4ef' }}>{c.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LinkCards({ b }: { b: Extract<Block, { type: 'linkCards' }> }) {
  const cols = b.cols ?? 2;
  return (
    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 13 }} className="responsive-cards">
      {b.items.map((c, i) => (
        <Link
          key={i}
          href={c.href ?? '#'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: 13,
            padding: '15px 16px',
            background: 'rgba(12,17,26,.5)',
            border: '1px solid rgba(130,165,220,.1)',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all .18s',
          }}
          className="next-link"
        >
          {c.icon && <span style={{ fontSize: 19 }}>{c.icon}</span>}
          <span style={{ fontSize: 14, fontWeight: 600, color: '#dbe4ef' }}>{c.title}</span>
          <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6b7d" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

/* ── Main DocPage component ─────────────────────────────────────────── */
export default function DocPage({ group, title, badge, intro, blocks }: DocPageProps) {
  return (
    <>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '52px 56px 0' }} className="doc-content">
        {/* Group label */}
        <div style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: 11,
          letterSpacing: '.2em',
          textTransform: 'uppercase',
          color: '#34e1d4',
        }}>{group}</div>

        {/* Title + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 40, letterSpacing: '-.03em', fontWeight: 700, lineHeight: 1.05, color: '#eef3f9' }}>{title}</h1>
          {badge && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(61,220,132,.1)',
              border: '1px solid rgba(61,220,132,.26)',
              fontSize: 12,
              color: '#74e6a4',
              fontWeight: 500,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ddc84', display: 'block' }} />
              {badge}
            </span>
          )}
        </div>

        {/* Intro */}
        <p style={{ margin: '18px 0 0', fontSize: 17, lineHeight: 1.6, color: '#9aa8bd', maxWidth: 680 }}>{intro}</p>
        <div style={{ height: 1, background: 'linear-gradient(90deg,rgba(130,165,220,.22),transparent)', margin: '30px 0 6px' }} />

        {/* Blocks */}
        {blocks.map((b, i) => {
          switch (b.type) {
            case 'h':        return <Heading key={i} b={b} />;
            case 'p':        return <p key={i} style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.72, color: '#a7b3c4' }}>{b.text}</p>;
            case 'code':     return <div key={i} style={{ marginTop: 18 }}><CopyCodeBlock code={b.code} label={b.label} prompt={b.prompt} /></div>;
            case 'callout': {
              const t = tones[b.tone];
              return (
                <div key={i} style={{ marginTop: 20, borderRadius: 14, padding: '17px 19px', background: t.bg, border: `1px solid ${t.border}`, display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: t.fg, marginBottom: 4, fontSize: 14.5 }}>{b.title}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.62, color: '#aeb9ca' }}>{b.text}</div>
                  </div>
                </div>
              );
            }
            case 'steps':     return <Steps key={i} b={b} />;
            case 'table':     return <Table key={i} b={b} />;
            case 'cards':     return <Cards key={i} b={b} />;
            case 'list':      return <BulletList key={i} b={b} />;
            case 'kv':        return <KV key={i} b={b} />;
            case 'matrix':    return <Matrix key={i} b={b} />;
            case 'timeline':  return <Timeline key={i} b={b} />;
            case 'faq':       return <FAQ key={i} b={b} />;
            case 'divider':   return <div key={i} style={{ height: 1, background: 'linear-gradient(90deg,rgba(130,165,220,.18),transparent)', margin: '36px 0 0' }} />;
            case 'next':      return <Next key={i} b={b} />;
            case 'linkCards': return <LinkCards key={i} b={b} />;
            default:          return null;
          }
        })}

        <div style={{ height: 80 }} />
      </div>

      <style>{`
        @media (max-width: 767px) {
          .doc-content { padding: 32px 24px 0 !important; }
          .doc-content h1 { font-size: 28px !important; }
          .responsive-cards { grid-template-columns: 1fr !important; }
          .responsive-next { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 479px) {
          .responsive-next { grid-template-columns: 1fr !important; }
        }
        .card-hover:hover { border-color: rgba(52,225,212,.3) !important; }
        .next-link:hover { border-color: rgba(52,225,212,.34) !important; background: rgba(255,255,255,.05) !important; }
      `}</style>
    </>
  );
}
