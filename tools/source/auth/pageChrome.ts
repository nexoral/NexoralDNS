/**
 * Document shell, icons and stylesheet for this server's browser-facing pages.
 * Split out from the sign-in page itself so the markup stays readable next to a
 * ~400-line stylesheet. Everything is inlined because this server has no
 * guaranteed internet access and must render identically on an isolated LAN.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Inline data-URI favicon, so the browser's automatic /favicon.ico request doesn't 404 against the MCP router. */
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ccircle cx='16' cy='8' r='3.6' fill='white'/%3E%3Ccircle cx='9' cy='25' r='2.8' fill='white' opacity='.9'/%3E%3Ccircle cx='23' cy='25' r='2.8' fill='white' opacity='.9'/%3E%3Cpath d='M16 12v4M9 21v-2.5h14V21' stroke='white' stroke-width='1.8' fill='none' opacity='.65'/%3E%3C/svg%3E";

/** The product logomark — a DNS hierarchy: one root delegating to two children. */
export function logo(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <path d="M12 8.4v3.1M6.6 18v-1.7a1 1 0 0 1 1-1h8.8a1 1 0 0 1 1 1V18" opacity=".65"/>
      <circle cx="12" cy="5.6" r="2.8" fill="#fff" stroke="none"/>
      <circle cx="6.6" cy="19.4" r="2.2" fill="#fff" stroke="none" opacity=".9"/>
      <circle cx="17.4" cy="19.4" r="2.2" fill="#fff" stroke="none" opacity=".9"/>
    </svg>`;
}

const S = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

export const ICON = {
  shield: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3l7.5 3v5.6c0 4.4-3 8.3-7.5 9.4-4.5-1.1-7.5-5-7.5-9.4V6z"/><path d="M9.2 12.2l2 2 3.6-3.9"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/></svg>`,
  key: `<svg viewBox="0 0 24 24" ${S}><circle cx="8" cy="12" r="3.4"/><path d="M11.4 12H21M17.6 12v3.2M14.6 12v2.4"/></svg>`,
  revoke: `<svg viewBox="0 0 24 24" ${S}><path d="M4.2 12a7.8 7.8 0 1 0 2.5-5.7"/><path d="M4 5.4V10h4.6"/></svg>`,
  lan: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="4" width="18" height="11" rx="2"/><path d="M8 19h8M12 15v4"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" ${S}><rect x="3.5" y="10.5" width="17" height="9.5" rx="2.4"/><path d="M7.2 10.5V7a4.8 4.8 0 0 1 9.6 0v3.5"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/></svg>`,
  users: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 19.5c0-1.7-.5-3.1-1.4-4.2"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.3 2.4 14 0 17.2M12 3.4c-2.4 2.3-2.4 14 0 17.2"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" ${S}><path d="M4 6h16M7 12h10M10 18h4"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" ${S}><path d="M4 19.5V13M9.5 19.5V6M15 19.5v-8M20.5 19.5V9"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24" ${S}><path d="M5 20V13M5 9V4M12 20v-8M12 8V4M19 20v-5M19 11V4"/><path d="M2.5 11h5M9.5 10h5M16.5 13h5"/></svg>`,
  router: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5h.01M11 16.5h.01M12 9.5V6M8.8 8a4.5 4.5 0 0 1 6.4 0"/></svg>`,
};

/** The one stylesheet, shared by every page. Committed to a single dark look. */
export const PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  /* Committed to a single dark look — color-scheme: dark also darkens the
     browser's own form controls, scrollbars and autofill chrome to match. */
  :root {
    color-scheme: dark;
    --bg: #08090c;
    --surface: rgba(24, 26, 32, .78);
    --surface-solid: #16181d;
    --panel: rgba(255, 255, 255, .022);
    --inset: rgba(255, 255, 255, .045);
    --border: rgba(255, 255, 255, .09);
    --border-strong: rgba(255, 255, 255, .15);
    --text: #edeff3;
    --muted: #98a1b2;
    --faint: #6b7484;
    --accent: #6366f1;
    --accent-hover: #7376f4;
    --accent-soft: rgba(99, 102, 241, .15);
    --accent-ring: rgba(99, 102, 241, .32);
    --ok: #34d399;
    --warn-bg: rgba(251, 191, 36, .10);
    --warn-border: rgba(251, 191, 36, .24);
    --warn-text: #fcd34d;
    --danger-bg: rgba(248, 113, 113, .10);
    --danger-border: rgba(248, 113, 113, .24);
    --danger-text: #fca5a5;
    --shadow: 0 1px 2px rgba(0, 0, 0, .45), 0 16px 40px -12px rgba(0, 0, 0, .65);
    --blob-a: rgba(99, 102, 241, .20);
    --blob-b: rgba(20, 184, 166, .13);
  }

  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 44px 32px;
    background: var(--bg);
    color: var(--text);
    font: 400 15.5px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Two slowly drifting colour fields — depth with no image asset. */
  body::before, body::after {
    content: "";
    position: fixed;
    z-index: 0;
    pointer-events: none;
    border-radius: 50%;
    filter: blur(30px);
  }
  body::before {
    top: -24vmax; left: -16vmax;
    width: 64vmax; height: 64vmax;
    background: radial-gradient(circle at 50% 50%, var(--blob-a), transparent 68%);
    animation: drift-a 26s ease-in-out infinite alternate;
  }
  body::after {
    right: -20vmax; bottom: -26vmax;
    width: 58vmax; height: 58vmax;
    background: radial-gradient(circle at 50% 50%, var(--blob-b), transparent 70%);
    animation: drift-b 32s ease-in-out infinite alternate;
  }
  @keyframes drift-a { to { transform: translate3d(6vmax, 4vmax, 0) scale(1.12); } }
  @keyframes drift-b { to { transform: translate3d(-5vmax, -4vmax, 0) scale(1.1); } }

  .shell {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1400px;
    display: grid;
    gap: 30px;
  }

  /* ---------- entrance ---------- */
  .enter {
    animation: rise .42s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(var(--d, 0) * 1ms);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(10px); } }

  /* ---------- top bar ---------- */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
  .brand { display: flex; align-items: center; gap: 13px; }
  .brand-text { display: grid; }
  .brand-name { font-size: 17px; font-weight: 650; letter-spacing: -.014em; }
  .brand-sub { font-size: 13px; color: var(--faint); }

  .mark {
    flex: none;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: linear-gradient(145deg, #6366f1, #4f46e5);
    box-shadow: 0 4px 14px -4px var(--accent-ring);
  }
  .mark svg { display: block; }

  .badges { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--panel);
    font-size: 12.5px;
    font-weight: 550;
    color: var(--muted);
    white-space: nowrap;
  }
  .badge svg { width: 14px; height: 14px; color: var(--accent); }
  .badge--live svg { color: var(--ok); }

  /* ---------- three column body ---------- */
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 424px minmax(0, 1fr);
    gap: 44px;
    align-items: start;
  }

  .panel { min-width: 0; display: grid; gap: 28px; align-content: start; }

  section > h2 {
    margin: 0 0 15px;
    font-size: 11.5px;
    font-weight: 650;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: var(--faint);
  }

  ul, ol { margin: 0; padding: 0; list-style: none; }

  .rowtext { display: grid; gap: 3px; min-width: 0; }
  .rowtext b { font-size: 14.5px; font-weight: 600; line-height: 1.4; }
  .rowtext > span { font-size: 13.5px; line-height: 1.5; color: var(--muted); }

  .icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--inset);
    color: var(--accent);
  }
  .icon svg { width: 17px; height: 17px; }
  .icon--sm { width: 27px; height: 27px; border-radius: 8px; }
  .icon--sm svg { width: 15px; height: 15px; }

  /* ---------- steps ---------- */
  .step {
    position: relative;
    display: flex;
    gap: 14px;
    padding-bottom: 22px;
    animation: rise .4s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(120ms + var(--i) * 55ms);
  }
  .step:last-child { padding-bottom: 0; }
  .step:not(:last-child)::before {
    content: "";
    position: absolute;
    left: 12px;
    top: 27px;
    bottom: 4px;
    width: 1.5px;
    border-radius: 1px;
    background: var(--border-strong);
  }

  .step-dot {
    flex: none;
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border: 1.5px solid var(--border-strong);
    border-radius: 50%;
    background: var(--surface-solid);
    color: #fff;
  }
  .step-dot svg { width: 13px; height: 13px; }
  .step-dot i { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }

  .step--done .step-dot { border-color: var(--ok); background: var(--ok); }
  .step--active .step-dot { border-color: var(--accent); background: var(--accent-soft); }
  .step--active .step-dot i { background: var(--accent); animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--accent-ring); }
    50% { box-shadow: 0 0 0 6px transparent; }
  }
  .step--next .rowtext b { color: var(--muted); }
  .step--next .rowtext > span { color: var(--faint); }

  /* ---------- connection details ---------- */
  .details {
    display: grid;
    gap: 1px;
    border: 1px solid var(--border);
    border-radius: 13px;
    overflow: hidden;
    background: var(--border);
  }
  .details div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 13px;
    background: var(--panel);
    font-size: 13px;
  }
  .details dt { color: var(--muted); white-space: nowrap; }
  .details dd {
    margin: 0;
    font-weight: 550;
    text-align: right;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .details .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
  }

  /* ---------- facts ---------- */
  .fact {
    display: flex;
    gap: 13px;
    padding-bottom: 20px;
    animation: rise .4s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(120ms + var(--i) * 50ms);
  }
  .fact:last-child { padding-bottom: 0; }

  /* ---------- capabilities ---------- */
  .caps {
    display: grid;
    gap: 7px;
  }
  .cap {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 8px 11px;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--panel);
    font-size: 13.5px;
    animation: rise .4s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(160ms + var(--i) * 45ms);
    transition: border-color .15s ease, transform .15s ease;
  }
  .cap:hover { border-color: var(--accent); transform: translateX(2px); }
  .cap-label { flex: 1; min-width: 0; }
  .cap-count {
    flex: none;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
  .caps-total {
    margin: 11px 0 0;
    font-size: 12.5px;
    color: var(--faint);
  }

  /* ---------- the card ---------- */
  .card {
    min-width: 0;
    padding: 36px;
    border: 1px solid var(--border);
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow);
    backdrop-filter: blur(22px) saturate(140%);
    -webkit-backdrop-filter: blur(22px) saturate(140%);
  }
  .card .mark { display: none; margin-bottom: 22px; }

  h1 {
    margin: 0 0 7px;
    font-size: 24px;
    font-weight: 650;
    letter-spacing: -.024em;
  }
  .lede { margin: 0 0 24px; font-size: 14.5px; color: var(--muted); }

  /* The OAuth trust signal: names the client that asked for access. */
  .consent {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 22px;
    padding: 13px 14px;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: var(--inset);
    font-size: 14px;
    line-height: 1.45;
    color: var(--muted);
  }
  .consent svg { flex: none; width: 17px; height: 17px; color: var(--accent); }
  .consent b { color: var(--text); font-weight: 650; }

  .field { margin-bottom: 16px; }
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }
  .control { position: relative; display: flex; }

  input {
    width: 100%;
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    background: var(--surface-solid);
    color: var(--text);
    font: inherit;
    font-size: 15.5px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  input::placeholder { color: var(--faint); }
  input:hover { border-color: var(--accent); }
  input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3.5px var(--accent-ring);
  }
  /* Chrome paints its own autofill background; keep the field on-theme. */
  input:-webkit-autofill, input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--text);
    -webkit-box-shadow: 0 0 0 100px var(--surface-solid) inset;
  }
  #password { padding-right: 46px; }

  .peek {
    position: absolute;
    top: 50%;
    right: 6px;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--faint);
    cursor: pointer;
    transition: color .15s ease, background-color .15s ease;
  }
  .peek:hover { color: var(--text); background: var(--inset); }
  .peek:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .peek svg { width: 18px; height: 18px; }

  button[type="submit"] {
    width: 100%;
    height: 48px;
    margin-top: 23px;
    border: 0;
    border-radius: 12px;
    background: var(--accent);
    color: #fff;
    font: inherit;
    font-size: 15.5px;
    font-weight: 650;
    cursor: pointer;
    transition: background-color .15s ease, transform .1s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .12), 0 8px 18px -7px var(--accent-ring);
  }
  button[type="submit"]:hover { background: var(--accent-hover); }
  button[type="submit"]:active { transform: translateY(1px); }
  button[type="submit"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  button[type="submit"][aria-busy="true"] { opacity: .72; cursor: progress; }

  .error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0 0 21px;
    padding: 12px 14px;
    border: 1px solid var(--danger-border);
    border-radius: 12px;
    background: var(--danger-bg);
    color: var(--danger-text);
    font-size: 14px;
    line-height: 1.45;
    animation: shake .4s cubic-bezier(.36, .07, .19, .97) both;
  }
  .error svg { flex: none; width: 17px; height: 17px; margin-top: 1px; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    22% { transform: translateX(-4px); }
    55% { transform: translateX(3px); }
    80% { transform: translateX(-1.5px); }
  }

  /* Honest transport indicator — filled in by script, since only the browser knows the scheme. */
  .transport {
    display: none;
    align-items: flex-start;
    gap: 10px;
    margin: 22px 0 0;
    padding: 11px 13px;
    border: 1px solid var(--warn-border);
    border-radius: 11px;
    background: var(--warn-bg);
    color: var(--warn-text);
    font-size: 13px;
    line-height: 1.45;
  }
  .transport svg { flex: none; width: 16px; height: 16px; margin-top: 1px; }

  .card footer {
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--faint);
  }
  .card footer .host { color: var(--muted); font-weight: 600; }

  /* ---------- responsive ---------- */

  /* Below three columns: one column, card first, context beneath it. */
  @media (max-width: 1180px) {
    body { align-items: flex-start; padding: 32px 22px; }
    .columns {
      grid-template-columns: minmax(0, 1fr);
      gap: 30px;
    }
    .shell { max-width: 720px; }
    .card { order: 1; justify-self: center; width: 100%; max-width: 460px; }
    .panel--left { order: 2; }
    .panel--right { order: 3; }
    .card .mark { display: grid; }
    .topbar { display: none; }
  }

  /* Two context columns side by side while there is still room. */
  @media (min-width: 760px) and (max-width: 1180px) {
    .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card { grid-column: 1 / -1; }
    .panel { gap: 26px; }
  }

  @media (max-width: 600px) {
    body { padding: 24px 15px; }
    .shell { gap: 24px; }
    .columns { gap: 26px; }
    .card { padding: 26px 21px; border-radius: 18px; max-width: none; }
    h1 { font-size: 21px; }
    .lede { font-size: 14px; margin-bottom: 20px; }
  }

  @media (max-width: 390px) {
    body { padding: 18px 12px; }
    .card { padding: 21px 17px; }
    .icon { width: 29px; height: 29px; border-radius: 9px; }
    .icon svg { width: 16px; height: 16px; }
    .details div { padding: 9px 11px; font-size: 12.5px; }
  }

  /* Short desktop viewports: tighten so the page still fits without scrolling. */
  @media (min-width: 1181px) and (max-height: 780px) {
    body { padding: 26px 32px; }
    .shell { gap: 22px; }
    .step { padding-bottom: 16px; }
    .fact { padding-bottom: 15px; }
    .panel { gap: 22px; }
    .card { padding: 28px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
  }

  @media (prefers-contrast: more) {
    :root { --border: rgba(255, 255, 255, .3); --border-strong: rgba(255, 255, 255, .5); --muted: #c3cad6; --faint: #9aa3b2; }
  }
`;

/** Wraps page content in the common document shell. */
export function htmlDocument(title: string, body: string, script = ""): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="icon" href="${FAVICON}">
<style>${PAGE_CSS}</style>
</head>
<body>
${body}
${script ? `<script>\n${script}\n</script>` : ""}
</body>
</html>`;
}
