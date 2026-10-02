# AGENTS.md — `tools/` (the MCP server for AI tools)

This lets an AI assistant such as Claude manage NexoralDNS. It speaks
[Model Context Protocol](https://modelcontextprotocol.io) (MCP) on `0.0.0.0:4774` at the
`/mcp` path.

**The most important thing to know:** this is only a **translator**. It does not talk to
MongoDB, Redis or RabbitMQ, and it has no business logic. Every tool call becomes an ordinary
HTTP request to the real API at `http://127.0.0.1:4773/api/...`. Logins and permission
checks happen there, in `server/`. This folder must never decide who is allowed to do what.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.**
Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in.** Say which command you want to run, say why, wait for a yes.
Permission covers only that moment — ask again next task, and before any *new* command.
No permission needed for `npm run build`; it only type-checks.

**2. Ask when you are not sure — even mid-task.** Ask if the request is unclear, two files
disagree, the code does not support what you were asked, you would have to invent an API to
continue, or you are about to delete something you did not create. Being wrong 200 lines
in costs far more than one early question. Prefer the smallest change you can undo.
Reading code to answer a question is research, not a guess — making up behaviour is a guess.

**3. Check graphify before using it.** Run
`test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"`.
Use `graphify query "<q>"` **only** if that prints `graphify available`; otherwise just use
grep/glob/read normally — no comment needed, it is not an error.

---

## 1. Check your work

Without asking: `npm run build` (runs `tsc`). **Ask first:** `cd ../Test && npm run
test:tools` or `npm run coverage:tools`. `npm start` runs `lib/index.js`; `npm run dev`
builds first, then runs it.

> `tools/` is deliberately **not** part of the npm workspace. `cd` in and install here.

## 2. Where things live

`source/index.ts` holds the MCP transport and the Host-header safety check.
`source/auth/NexoralOAuthProvider.ts` is the OAuth 2.1 server, which relies on `server/`.
`source/auth/loginPage.ts` is a small sign-in form — deliberately **not** a `client/` page.
`source/client/ApiClient.ts` makes the plain HTTP calls and runs the health check.
`source/client/HealthMonitor.ts` holds that check. `source/tools/register*Tools.ts` has one
file per group of API routes. `source/tools/toolResult.ts` tidies the reply so the AI reads
it cleanly.

## 3. The 54 tools

`registerPublicTools` has 2 (server info, health check) · `registerAuthTools` 2 (change
password, check session) · `registerDomainTools` 3 · `registerDnsTools` 4 · `registerUserTools`
6 · `registerRoleTools` 6 · `registerAccessControlTools` 16 (the biggest group, matching
`AccessControl.route.ts` one for one) · `registerDhcpTools` 2 · `registerSettingsTools` 6 ·
`registerAnalyticsTools` 5, including downloading a log export.

**There is deliberately no login tool, no logout tool, and no tool that takes a password.**
Signing in is done in a web browser. That is on purpose: it keeps passwords away from the AI.

---

## 4. Rules you must not break

- **`server/` decides everything about identity.** `authorize()` saves the request and sends
  the browser to a sign-in page. That page posts to `POST /api/auth/login` and reads the
  tokens from the `Set-Cookie` header. Refreshing a token calls `/api/auth/refresh-token`;
  logging out calls `/api/auth/logout`.
- **Tokens travel as a cookie, not a Bearer header.** `ApiClient` sends
  `Cookie: access_token=...` because `server/` reads `request.cookies` directly. Do not
  "modernise" this — it would break every tool.
- **`ApiClient` keeps no session and never refreshes anything.** Refreshing is the AI
  client's job, through the OAuth grant.
- **Every signed-in call is checked first.** `HealthMonitor.ensureHealthy()` calls
  `GET /api/health` (remembered for 3 seconds) before each one, so a broken database shows up
  as a clear message instead of a raw network error. `check_server_health` and
  `get_server_info` skip this check so they still work when something is wrong.
- **Hide anything password-shaped.** Any tool argument whose name contains "password" is
  written to the log as `[redacted]` (`index.ts:59`).
- **`download_log_export` is the odd one out.** That endpoint returns a plain text file
  instead of the usual JSON, so `ApiClient` reads it by content type rather than the normal
  helper, and cuts it off past 200,000 characters so it does not flood the AI's memory.
- **The Host-header check blocks unwanted callers.** A middleware looks at the `Host` header
  and only allows addresses found at startup (`localhost`, `127.0.0.1`, and every
  non-internal IPv4 address on this machine, each with port 4774). Do not remove it, and do
  not swap it for the SDK's `allowedHosts` option — that one is deprecated.

## 5. Login state

Each login code is 32 random bytes, works **once** (it is deleted on the first attempt, pass
or fail), expires after 60 seconds, and is tied to the client and `redirect_uri` that asked
for it. A login started but never finished expires after 10 minutes. Both maps are cleaned up
whenever something new is added, so they cannot grow forever.

Checking a token calls `GET /api/auth/verify`. **Successes are remembered for 30 seconds;
failures are never remembered**, so a bad token fails immediately instead of after a wait.
Registered clients live in one file: `~/.nexoraldns/oauth-clients.json`, mode `0600`.

## 6. Settings

`MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL=true` is set by `ecosystem.config.js`. Normal
OAuth rules only allow plain `http` on localhost, so this relaxes that. The SDK reads it once
when it loads, so it must come from the environment — setting it in code will not work.
`MCP_PUBLIC_URL` defaults to this machine's first non-internal IPv4 address; point it at an
`https` address with a certificate if your network is not trusted.

Note that by default the sign-in page and every token cross your LAN **without encryption**.
That is fine on a home network you trust. A public HTTPS address is out of scope — this
system is LAN-only by design.

## 7. Known limitation

Logins in progress, unused login codes and the 30-second token cache all live in this
process's memory. If `tools/` restarts while someone is signing in, they start again. Tokens
that were already issued still work, because the AI client holds them and `server/` checks
them. Also, `server/` keeps one session per user, so signing in from an AI tool ends that
account's dashboard session. Use a separate account for AI access.

## 8. Boundaries

**Always** — keep tools thin: translate the request, forward it, return the reply, no logic
· **write** a test in `Test/tools/` for any tool change (running it is opt-in) · redact
password-shaped arguments before logging.

**Ask first** — adding or renaming a tool, since tool names are published and other people
depend on them · changing the Host-header allowlist · changing anything in the OAuth provider
or the `MCP_PUBLIC_URL` default.

**Never** — add a login tool, a logout tool, or a tool that takes a password · connect to
MongoDB, Redis or RabbitMQ from here · decide permissions here, `server/` owns that · send raw
tokens back to the AI · remove the Host-header check.