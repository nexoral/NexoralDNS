'use client';

import { useState } from 'react';

interface Props {
  code: string;
  label?: string;
  prompt?: boolean;
}

export default function CopyCodeBlock({ code, label = 'bash', prompt = true }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = prompt ? code.replace(/^\$ /, '') : code;
    try { navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    clearTimeout((handleCopy as any)._t);
    (handleCopy as any)._t = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={{
      position: 'relative',
      border: '1px solid rgba(120,160,220,.16)',
      borderRadius: 14,
      background: 'linear-gradient(180deg,#0b0f16,#070a10)',
      overflow: 'hidden',
      fontFamily: 'var(--font-geist-mono),SF Mono,monospace',
      boxShadow: '0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px -28px rgba(0,0,0,.9)',
      maxWidth: '100%',
      minWidth: 0,
    }}>
      {/* Title bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(120,160,220,.1)',
        background: 'rgba(255,255,255,.015)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57', display: 'block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e', display: 'block' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840', display: 'block' }} />
        </div>
        <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f6b7d', fontWeight: 500 }}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'inherit',
            fontSize: 11,
            letterSpacing: '.04em',
            color: copied ? '#3ddc84' : '#9fb0c5',
            background: 'rgba(120,160,220,.08)',
            border: '1px solid rgba(120,160,220,.16)',
            borderRadius: 7,
            padding: '5px 10px',
            cursor: 'pointer',
            transition: 'all .18s ease',
          }}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: copied ? '#3ddc84' : '#5f6b7d',
            display: 'block',
          }} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre style={{
        margin: 0,
        padding: '16px 18px',
        overflowX: 'auto',
        fontSize: 13.5,
        lineHeight: 1.7,
        color: '#cdd9e8',
        whiteSpace: 'pre',
      }}>
        {prompt && <span style={{ color: '#3ddc84', userSelect: 'none' }}>$ </span>}
        {code}
      </pre>
    </div>
  );
}
