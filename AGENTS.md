# AGENTS.md

How to work on **NexoralDNS**. Read this before changing any code.

NexoralDNS is a DNS server for a home or office network. It answers lookups for devices on your LAN, blocks unwanted sites, and has a web dashboard. Everything runs on your own machines — nothing goes to the cloud.

## 1. What is in this repo

- `Web/` — the DNS server itself, in Go. Answers lookups on ports 53 and 853
- `server/` — the admin API (Fastify, TypeScript) on port 4773, under the path `/api`
- `client/` — the dashboard you open in a browser, on port 4000
- `tools/` — lets AI assistants (like Claude) manage NexoralDNS. Port 4774
- `DHCP/` — **not** a DHCP server despite the name. It lists devices on your network
- `shared/` — code used by both `server/` and `DHCP/`
- `Test/` — all automated tests · `Scripts/` — installer, Docker files, CLI

Version `7.24.71-stable` (see the `VERSION` file).

Do not guess versions. `Web/` uses Go 1.26. `server/` uses TypeScript 5.9 compiled to CommonJS, with Fastify. `client/` uses Next.js, React, axios, zustand, Tailwind and **biome** (not eslint or prettier). `tools/` uses the MCP SDK 1.29 with Express. Tests use Vitest 4.1 for JavaScript and Go's built-in test tool for Go. Node.js 18 or newer, with **npm** — not yarn or pnpm.

## 2. Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.**

**1. Tests are opt-in.** Do not run them on your own. Say which command you want to run and why, then wait for the user to say yes. Permission covers **only that moment** — on the next task ask again, and ask again before any *new* command even a narrower one. "Run everything" means run it now, not "you may run tests any time today".

You do **not** need permission for these, because they change nothing: `go build`, `go vet`, `gofmt -l`, `npm run build`, `npm run lint`, `git status`, `git diff`.

**2. Ask when you are not sure — even mid-task.** Stop and ask if the request is unclear, two files disagree, the code does not support what you were asked, you would have to invent an API or field to keep going, you are about to delete something you did not create, or something looks like a bug. This applies at the start of a task *and* in the middle of one: being wrong 200 lines into a change costs far more than one early question. If you cannot ask, make the smallest change you can undo, then say clearly what you assumed.

One useful distinction: reading code to answer a question is *research*, not a guess. Making up behaviour that does not exist *is* a guess — ask instead.

**3. Check that graphify is available before using it.** Do not assume it is set up:

```bash
test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"
```

Use `graphify query "<your question>"` as your normal way to search this codebase **only** if that prints `graphify available`. If the folder or the tool is missing, just use `grep`, `glob` or open files. Do not mention it, do not treat it as an error, do not stop working.

## 3. Commands

Safe without asking — `cd Web && go build ./... && go vet ./... && gofmt -l .` (builds and checks only, does not run tests) · `cd server && npm run build` · `cd client && npm run lint`

`gofmt -l .` must print **nothing** — CI fails if any Go file is unformatted.

**Ask first, every time**, from `cd Test`: `npm test` (everything) · `npm run test:server` (28) · `npm run test:tools` (18) · `npm run test:dhcp` (4) · `npm run test:web` (Go engine) · `npm run coverage` (all four, with a report).

To run it on your own machine — MongoDB, Redis and RabbitMQ must already be running:

```bash
cd Web    && go build -o web . && sudo ./web   # ports 53 and 853 need root
cd server && npm run dev      # API 4773      cd client && npm run dev   # dashboard 4000
cd tools  && npm run dev      # MCP 4774       cd DHCP   && npm run dev   # sudo, writes resolv.conf
```

Install on a server: `curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | sudo bash -` then `nexoraldns start | stop | update | pack | remove`.

To search the code, if graphify is available, use it before grep or glob: `graphify query "where is ACL cache invalidation handled"`. Also read `graphify-out/GRAPH_REPORT.md` — it lists the biggest and most connected files. After you change code files, rebuild the graph (writes only inside `graphify-out/`):

```bash
python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
```

## 4. The most important thing to get right

The DNS lookup path has **4 steps, not 7**. Older notes described 7 steps including a "client plan" check and "domain rerouting". **Neither exists.** Nothing anywhere redirects one domain to another, and nothing checks a subscription plan during a lookup.

The 4 steps are in `Web/internal/rules/pipeline.go`: **1. Is the service switched on?** (memory 5s, Redis 60s, MongoDB) · **2. Is this site blocked for this device?** (memory 5s, Redis rule sets) · **3. Do we have a local answer?** (Redis, then MongoDB, following CNAME links up to 10 deep) · **4. No local answer, so ask another DNS server** (6 public servers, tried in random order).

Three rules you must never break:

- **When something fails, let the lookup succeed anyway.** If MongoDB is down, steps 1 and 2 cannot check anything so they are skipped — but the device still resolves through cache or step 4. If the rule sets cannot be read, step 2 allows the request. A whole network losing DNS is worse than briefly missing a block rule.
- **Logging must never slow down an answer.** Query stats go out in a background goroutine. A lookup never waits for RabbitMQ.
- **The "one line per query" log is `Debug`, not `Info`.** At real traffic that single line is the most expensive thing on this path.

## 5. Code style

One real example is worth more than a page of description. (A Go example is in `Web/AGENTS.md`.)

```typescript
// GOOD — shared service, request data passed in as arguments
const service = container.get<UsersService>('UsersService');
await service.createUser(data, reply);

// BAD — new instance, and it stores per-request state
const svc = new UsersService(reply);
```

Never use the TypeScript type `any`. Check the cache before the database. When calls do not depend on each other, run them together (`Promise.all`, `errgroup`) — following a CNAME chain is the one case that must be step by step. When something fails: log it with context, return a safe answer, never crash the lookup. Add a short JSDoc comment above public methods.

Commit messages start with `feat:`, `fix:`, `chore:`, `docs:`, `test:` or `refactor:`. Branches are `main` for releases and `maintainer/<name>` for work. A version bump is its own commit touching `VERSION` and each `package.json`. Never commit `*.log`, `coverage*`, `lib/`, `.next/`, `node_modules/`, `.env`, the `Web/web` binary, or `graphify-out/cache`.

## 6. Rules — always, ask first, never

**Always** — build, vet and type-check freely, but **ask before running any test suite** · get services in `server/` from the DI container, no `getInstance()` and no `new XService()` · copy DI key strings exactly, since TypeScript cannot check them and a typo fails only at runtime · rebuild the graphify graph after editing code files · keep the lookup path fast (baseline: **12,746 queries/second at 3.8 ms average, 0 lost**, via `dnsperf` with 49 domains on a warm cache on a Ryzen 5 5500U — if a change drops below, explain why) · **write** a test for any behaviour change, though running it is opt-in.

**Ask first** — changing a MongoDB field or index, since the two clusters size their connection pools separately and do not coordinate · adding a dependency, or touching CI, `Dockerfile`, `Scripts/` or `ecosystem.config.js` · anything to do with login, permissions, JWT tokens or CORS · renaming a REST route or an MCP tool, since both are public interfaces · changing the upstream DNS server list or circuit-breaker settings.

**Never** — suggest cloud or public-internet hosting: this is LAN-only by design, ISPs block DNS traffic from public IPs, and ports 53/853 must never be exposed online · add a wait, a rate limit or a blocking check to the lookup path without measuring first · remove the `recover()` inside the query goroutine, because a panic cannot jump between goroutines, so the outer one alone will not save the server from a bad packet · put tokens in a JSON response body, or log passwords, raw tokens or MCP tool arguments whose name contains "password" · commit secrets, `.env` files or the JWT secret at `/etc/nexoral/jwt.secret` · edit `node_modules/`, `lib/` or `.next/` · delete a failing test to go green.

## 7. Known gaps and contributing

Known gaps are listed honestly in `ARCHITECTURE.md`: no live p50/p95/p99 latency numbers, no rate limiting on the lookup path, the bare-metal installer does not raise the UDP buffer limit, no domain rerouting or per-user plans, forwarder metrics have no endpoint, two real bugs in the device broker, and some dead code. **Do not fix these silently.**

This is source-available software and we do not accept code contributions — see `LICENSE` and `CONTRIBUTING.md`. Bug reports and feedback are welcome.