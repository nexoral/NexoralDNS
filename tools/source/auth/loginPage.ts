import { LOGIN_PATH } from "../core/key";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * The page a user lands on after their MCP client sends them to `/authorize`.
 * Deliberately a single self-contained string rather than a template engine or
 * a route in the Next.js dashboard — it renders one form, and keeping it here
 * means the OAuth flow touches nothing outside `tools/`.
 */
export default function renderLoginPage(requestId: string, clientName: string, error?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in — NexoralDNS</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font: 15px/1.5 system-ui, sans-serif; background: #f4f5f7; color: #17181c; }
  main { width: min(360px, calc(100vw - 3rem)); background: #fff; padding: 2rem;
         border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  h1 { margin: 0 0 .25rem; font-size: 1.25rem; }
  p.sub { margin: 0 0 1.5rem; color: #6b7280; font-size: .875rem; }
  label { display: block; margin-bottom: 1rem; font-size: .8125rem; font-weight: 600; }
  input { width: 100%; box-sizing: border-box; margin-top: .375rem; padding: .625rem .75rem;
          border: 1px solid #d1d5db; border-radius: 8px; font-size: .9375rem;
          background: inherit; color: inherit; }
  button { width: 100%; padding: .6875rem; border: 0; border-radius: 8px; cursor: pointer;
           background: #2563eb; color: #fff; font-size: .9375rem; font-weight: 600; }
  .error { margin: 0 0 1rem; padding: .625rem .75rem; border-radius: 8px;
           background: #fee2e2; color: #991b1b; font-size: .8125rem; }
  strong { font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d0e11; color: #e6e7ea; }
    main { background: #17181c; box-shadow: none; border: 1px solid #2a2c33; }
    input { border-color: #383a42; }
    p.sub { color: #9096a2; }
    .error { background: #3f1d1d; color: #fca5a5; }
  }
</style>
</head>
<body>
<main>
  <h1>Sign in to NexoralDNS</h1>
  <p class="sub"><strong>${escapeHtml(clientName)}</strong> is requesting access to your account.</p>
  ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
  <form method="post" action="${LOGIN_PATH}">
    <input type="hidden" name="request" value="${escapeHtml(requestId)}">
    <label>Username
      <input name="username" autocomplete="username" autofocus required>
    </label>
    <label>Password
      <input name="password" type="password" autocomplete="current-password" required>
    </label>
    <button type="submit">Sign in</button>
  </form>
</main>
</body>
</html>`;
}
