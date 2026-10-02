# AGENTS.md — `server/` (the admin API)

How to work on the REST API. It runs on `0.0.0.0:4773`, everything under `/api`, with a Swagger page at `/docs`. TypeScript 5.9, compiled to CommonJS.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.** Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in.** Say which command you want to run, say why, wait for a yes. Permission covers only that moment — ask again next task, and before any *new* command. No permission needed for `npm run build`; it only type-checks.

**2. Ask when you are not sure — even mid-task.** Ask if the request is unclear, two files disagree, the code does not support what you were asked, you would have to invent an API to continue, or you are about to delete something you did not create. Being wrong 200 lines in costs far more than one early question. Prefer the smallest change you can undo. Reading code to answer a question is research, not a guess — making up behaviour is a guess.

**3. Check graphify before using it.** Run `test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"`. Use `graphify query "<q>"` **only** if that prints `graphify available`; otherwise just use grep/glob/read normally — no comment needed, it is not an error.

---

## 1. Check your work

Without asking: `npm run build` (runs `tsc`; its prebuild step also builds `shared/`). **Ask first:** `cd ../Test && npm run test:server` or `npm run coverage:server`.

`npm start` runs `lib/cluster/Cluster.js`. `npm run dev` builds then runs `lib/core/fastify.js` — no cluster, no cron jobs.

## 2. How a request flows

Three layers. Each one only talks to the one below it.

```
Router/<Group>/<Group>.route.ts        ← the URL, the schema, the permission numbers
        ↓
Controller/<Group>/                     ← checks the input, builds the reply
        ↓
Services/<Group>/<Group>.service.ts    ← all the real logic lives here
        ↓
shared/                                 ← connects to MongoDB, Redis, RabbitMQ
```

**Put the logic in the service.** A controller that makes decisions is in the wrong place.

Nine route groups, all registered in `Router/Router.ts`, with the permission numbers each needs: `/auth` (rate-limited login and refresh) · `/domains` (1, 2) · `/dns` (19–22) · `/dhcp` (18) · `/settings` (4, 8) · `/analytics` (4, 3) · `/access-control` (4, 8) · `/users` (4, 5) · `/roles` (4, 6). Plus `GET /api/info` and `GET /api/health` with no login needed, and `GET /api/service-info` which does need one.

## 3. The DI container — how services are created

A "service" is a class that does the real work. It must come from the container and never be built by hand.

```typescript
// GOOD — register once, in container/appContainer.ts
container.register('UsersService', () => new UsersService(), true);

// GOOD — get the shared one, pass request data as arguments
const service = container.get<UsersService>('UsersService');
await service.createUser(data, reply);

// BAD — hand-made instance that stores request state
const svc = new UsersService(reply);
```

- Services are **shared**. They have an empty `constructor() { }` and keep **no per-request fields**. A service that remembers something from a request is a bug waiting to happen when two requests overlap.
- Pass `reply`, params and body as **arguments**, never through the constructor.
- Get MongoDB, Redis and RabbitMQ **fresh on every call** through the container. Storing a connection in a field breaks when it drops and reconnects.
- **DI keys are plain strings and TypeScript cannot check them.** `container.get('UsersService')` must match `register('UsersService', ...)` exactly — a typo is a crash at runtime, not a compile error.

The 27 registered keys: `AccessControlPolicyService`, `AddDNSService`, `AddDomainService`, `CacheService`, `ChangePasswordService`, `DashboardService`, `DefaultTTLService`, `DNSDeleteService`, `DNSListService`, `DNSUpdateService`, `DomainGroupService`, `DomainListService`, `HealthService`, `InfoService`, `IPGroupService`, `LoginService`, `LogoutService`, `LogsExportService`, `LogsService`, `RefreshTokenService`, `RemoveDomainService`, `RolesService`, `RouterConnectionService`, `ServiceToggleService`, `UsersService`, `VerifySessionService`.

**Correctly not in the container** because they take no dependencies: `buildResponse`, `bcrypt.helper`, `jwt.helper`, `RequestControllerHelper`, and the static middleware `authGuard` and `PermissionGuard`.

**SOLID** — **S** one job per class, so split a class that does three things. **O** add new things with new files, not by rewriting old ones. **L** if it claims to be a `CacheService`, it must behave like one everywhere. **I** keep interfaces small; many small ones beat one big one. **D** depend on the container and on interfaces, never on a real database directly.

## 4. TypeScript rules

Never use the type `any`. Check the cache before the database. When calls do not depend on each other, run them together with `Promise.all` — never a `for` loop with `await` inside it. Put shared code in one place: `buildLogsQuery`, the password rules and `escapeRegex` are each a single function **on purpose**, because copying them is what caused a real bug before. Add a short JSDoc comment above public service methods. When something fails: log it with context and return a safe result — never throw through.

```typescript
// GOOD — typed, cached first, fails safely
interface DNSRecord { name: string; type: 'A' | 'CNAME' | 'AAAA'; value: string; ttl: number }

async function findRecord(name: string): Promise<DNSRecord | null> {
  const cached = await redis.get(cacheKey(name));
  if (cached) return JSON.parse(cached) as DNSRecord;
  try {
    return await collection.findOne({ name });
  } catch (error) {
    logger.error('Record lookup failed', { error, name });
    return null;              // fail safely, never throw through
  }
}

// BAD
const response: any = await query();
```

## 5. Cron jobs — primary process only

`CronJob/CronJob.ts` starts them. **All of them skip unless this is the primary process**, so they do not run once per worker: `LoadPolicies.cron.ts` copies block rules into Redis every 60s and at start · `Connected_IP_fetcher.cron.ts` scans the network for devices every 2 min · `DashboardAnalytics.cron.ts` rolls up 24-hour totals every 5 min · `BatchAnalytics.cron.ts` reads the `DNS_analytics` queue 1000 at a time, 2s apart · `LogsExportWorker.cron.ts` builds export files 1000 documents at a time · `CleanupExports.cron.ts` deletes old exports hourly.

Database indexes and the permission/role seed data also run **only** in the primary. The JWT secret is read once in the primary **before** workers are forked, so all workers share it.

## 6. How blocking rules work

Rules → groups → Redis sets → a short memory cache → the answer `0.0.0.0`. Three fields decide it: **who it applies to** (`targetType`: `single_ip`, `multiple_ips`, `ip_group`, `multiple_ip_groups`, `all`) · **what is blocked** (`blockType`: `specific_domains`, `domain_group`, `multiple_domain_groups`, `full_internet` which is just `*`) · **how it is written** (`policyType`: `user_domain`, `user_internet`, `domain_all`, `domain_user`, `group_based`).

`forceReloadACLPolicies()` runs right after every rule or group change, so a change made through the API takes effect **immediately**. The 60-second cron is only a safety net for changes made directly in the database. Do not tell anyone to wait for the cron. The Go engine listens on a Redis channel called `cache:invalidate` and clears its own memory when it hears it.

### The three "modes" are just pre-made domain lists

`Adult Content (Anti-Porn)` has 92 domains, `Ads & Trackers (Anti-Ads)` has 155, and `AI Chat & Generative Tools (Anti-AI)` has 42. They are normal `domain_groups` records, seeded at startup by `utilities/Initialize*Group.utls.ts`, and managed through the **same** access-control API as anything you create yourself.

**There is no `/api/anti-porn-mode/` route and no `AntiPornMode.service.ts`.** The folders `Router/AntiPornMode/` and `Router/AntiAdsMode/` are empty leftovers. To add domains, edit the list in `Constants/*.constant.ts` and restart the server so it re-seeds.

## 7. Security

There are **22 permission numbers**, and number `4` means "Full Access" and skips every check. `PermissionGuard.canAccess(...codes)` passes if the user has **any** of the numbers given.

Tokens go in httpOnly cookies and **never** in the JSON body. The cookie is read first; `Authorization: Bearer` is only a fallback. Password rules (at least 8 characters, with an uppercase, a lowercase and a digit) live in `helper/passwordPolicy.helper.ts` — one file used by all three paths (create, admin reset, self-service) so they cannot drift apart. Escape user input before putting it in a search filter, and validate every id as an ObjectId.

Rate limits are 100 requests/minute/IP overall, 10 per 15 minutes on login, and 20 per 15 minutes on refresh. **There is no rate limit on DNS lookups themselves.**

`isActive === false` is what blocks a user; if the field is missing, the user is allowed. Easy to misread — do not flip the check. And there is one session document per user, so logging in from somewhere else ends the old session.

## 8. Boundaries

**Always** — get services from the container and keep them stateless · use the shared helpers instead of writing your own copy · **write** a test in `Test/server/` for any behaviour change (running it is opt-in).

**Ask first** — renaming a route, a DI key, or a service others depend on · changing the permission list or `core/key.ts` · changing collection names or adding indexes · changing the worker count in `cluster/Cluster.ts`.

**Never** — return tokens in a response body · store `reply` or any request data on a service · add `getInstance()` · log passwords or tokens · put business logic in a controller · register anything as a non-singleton.