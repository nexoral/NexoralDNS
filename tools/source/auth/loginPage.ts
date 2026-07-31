import { LOGIN_PATH } from "../core/key";
import { ICON, escapeHtml, htmlDocument, logo } from "./pageChrome";

interface Row {
  icon: string;
  title: string;
  body: string;
}

/** Deliberately factual, not reassuring-sounding: every line describes something the code actually does. */
const FACTS: Row[] = [
  {
    icon: ICON.shield,
    title: "Your permissions, nothing more",
    body: "The agent inherits your role exactly. Every call is re-checked by NexoralDNS itself — a Guest account still cannot create a DNS record.",
  },
  {
    icon: ICON.key,
    title: "Your password stays on this server",
    body: "It goes to NexoralDNS and nowhere else. The AI agent never receives it, and it never lands in your chat history.",
  },
  {
    icon: ICON.clock,
    title: "Access expires in 30 minutes",
    body: "Your client renews it quietly in the background for up to 48 hours, so signing in stays a rare event.",
  },
  {
    icon: ICON.revoke,
    title: "Revocable whenever you want",
    body: "Sign out from your client or change your password, and the connection dies with it immediately.",
  },
];

/** Mirrors the tool groups registered in tools/source/tools/register*Tools.ts. */
const CAPABILITIES: { icon: string; label: string; count: string }[] = [
  { icon: ICON.globe, label: "Domains & DNS records", count: "7" },
  { icon: ICON.users, label: "Users, roles & permissions", count: "12" },
  { icon: ICON.filter, label: "Access control & blocking", count: "17" },
  { icon: ICON.sliders, label: "Settings, TTL & cache", count: "6" },
  { icon: ICON.chart, label: "Analytics & query logs", count: "5" },
  { icon: ICON.router, label: "DHCP & connected devices", count: "2" },
];

const STEPS: { label: string; body: string; state: "done" | "active" | "next" }[] = [
  {
    label: "Access requested",
    body: "Your AI client discovered this server, registered itself, and asked to connect.",
    state: "done",
  },
  {
    label: "You sign in",
    body: "Confirm it is really you — on the server itself, not inside the chat.",
    state: "active",
  },
  {
    label: "Client connected",
    body: "You return to your agent, which receives a token and starts working.",
    state: "next",
  },
];

function renderSteps(): string {
  const check = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
  return STEPS.map(
    (step, i) => `        <li class="step step--${step.state}" style="--i:${i}">
          <span class="step-dot" aria-hidden="true">${step.state === "done" ? check : "<i></i>"}</span>
          <span class="rowtext"><b>${step.label}</b><span>${step.body}</span></span>
        </li>`,
  ).join("\n");
}

function renderFacts(): string {
  return FACTS.map(
    (fact, i) => `        <li class="fact" style="--i:${i}">
          <span class="icon" aria-hidden="true">${fact.icon}</span>
          <span class="rowtext"><b>${fact.title}</b><span>${fact.body}</span></span>
        </li>`,
  ).join("\n");
}

function renderCapabilities(): string {
  return CAPABILITIES.map(
    (cap, i) => `        <li class="cap" style="--i:${i}">
          <span class="icon icon--sm" aria-hidden="true">${cap.icon}</span>
          <span class="cap-label">${cap.label}</span>
          <span class="cap-count">${cap.count}</span>
        </li>`,
  ).join("\n");
}

/**
 * The page a user lands on after their MCP client sends them to `/authorize`.
 *
 * Deliberately rendered here rather than as a route in the Next.js dashboard —
 * keeping it in `tools/` means the OAuth flow touches nothing outside this module.
 */
export default function renderLoginPage(requestId: string, clientName: string, error?: string): string {
  const shortRequestId = escapeHtml(requestId.slice(0, 8));

  return htmlDocument(
    "Sign in to NexoralDNS",
    `<div class="shell">

  <header class="topbar enter" style="--d:0">
    <div class="brand">
      <span class="mark">${logo(24)}</span>
      <span class="brand-text">
        <span class="brand-name">NexoralDNS</span>
        <span class="brand-sub">Advanced DNS management &amp; surveillance for your local network</span>
      </span>
    </div>
    <div class="badges">
      <span class="badge">${ICON.lock} OAuth 2.1 · PKCE S256</span>
      <span class="badge">${ICON.lan} LAN-only</span>
      <span class="badge badge--live">${ICON.shield} 54 tools available</span>
    </div>
  </header>

  <div class="columns">

    <div class="panel panel--left enter" style="--d:60">
      <section>
        <h2>What happens now</h2>
        <ol class="steps">
${renderSteps()}
        </ol>
      </section>

      <section>
        <h2>Connection details</h2>
        <dl class="details">
          <div><dt>Requesting client</dt><dd>${escapeHtml(clientName)}</dd></div>
          <div><dt>Server</dt><dd class="mono" id="host-detail">—</dd></div>
          <div><dt>Protocol</dt><dd>OAuth 2.1 + PKCE</dd></div>
          <div><dt>Request</dt><dd class="mono">${shortRequestId}…</dd></div>
          <div><dt>Expires in</dt><dd>10 minutes</dd></div>
        </dl>
      </section>
    </div>

    <main class="card enter" style="--d:30">
      <span class="mark">${logo(24)}</span>

      <h1>Sign in to NexoralDNS</h1>
      <p class="lede">Use your dashboard account — the same username and password.</p>

      <div class="consent">
        ${ICON.lock}
        <span><b>${escapeHtml(clientName)}</b> is requesting access to your account.</span>
      </div>

      ${error
      ? `<p class="error" role="alert">
        ${ICON.alert}
        <span>${escapeHtml(error)}</span>
      </p>`
      : ""}

      <form method="post" action="${LOGIN_PATH}" id="form">
        <input type="hidden" name="request" value="${escapeHtml(requestId)}">

        <div class="field">
          <label for="username">Username</label>
          <div class="control">
            <input id="username" name="username" autocomplete="username" spellcheck="false"
                   autocapitalize="none" placeholder="admin" autofocus required>
          </div>
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="control">
            <input id="password" name="password" type="password" autocomplete="current-password"
                   placeholder="••••••••" required>
            <button type="button" class="peek" id="peek" aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2.2 12S6 5.5 12 5.5S21.8 12 21.8 12S18 18.5 12 18.5S2.2 12 2.2 12Z"/>
                <circle cx="12" cy="12" r="2.9"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" id="submit">Sign in</button>
      </form>

      <p class="transport" id="transport">
        ${ICON.alert}
        <span><b>Unencrypted connection.</b> This page is served over plain HTTP on your local network — treat it as LAN-trusted only.</span>
      </p>

      <footer>
        Your credentials go to this server and no further.<br>
        Signing in at <span class="host" id="host"></span>
      </footer>
    </main>

    <div class="panel panel--right enter" style="--d:90">
      <section>
        <h2>What the agent gets</h2>
        <ul class="facts">
${renderFacts()}
        </ul>
      </section>

      <section>
        <h2>What it can manage</h2>
        <ul class="caps">
${renderCapabilities()}
        </ul>
        <p class="caps-total">54 tools in total, each one a call against the same REST API the dashboard uses.</p>
      </section>
    </div>

  </div>

</div>`,
    `  (function () {
    var host = location.host;
    document.getElementById('host').textContent = host;
    document.getElementById('host-detail').textContent = host;

    // Only the browser knows the scheme, so this notice can't be rendered server-side.
    if (location.protocol !== 'https:' && !/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) {
      document.getElementById('transport').style.display = 'flex';
    }

    var password = document.getElementById('password');
    var peek = document.getElementById('peek');
    peek.addEventListener('click', function () {
      var hidden = password.type === 'password';
      password.type = hidden ? 'text' : 'password';
      peek.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
      password.focus();
    });

    // Guard against a double submit consuming the one-shot request id twice.
    var submit = document.getElementById('submit');
    document.getElementById('form').addEventListener('submit', function () {
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Signing in…';
      setTimeout(function () { submit.disabled = true; }, 0);
    });
  })();`,
  );
}
