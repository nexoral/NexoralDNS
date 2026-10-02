# AGENTS.md — `Test/` (all the tests)

Every automated test in this repository lives in this folder. Also here: `Test/dnsperf.txt`
(a list of 49 domains for the external `dnsperf` load-testing tool) and a
`docker-compose.yml` for starting test databases.

**Go tests are the exception.** Go requires `_test.go` files to sit in the same folder as the
code they test, so those live in `Web/` (13 files) and run with `npm run test:web`.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.**
Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in, and this folder *is* the test suite** — so ask before running anything
in it. Say which command you want to run, say why, wait for a yes. Permission covers only that
moment — ask again next task. **Writing** tests does not need permission. Only **running** them does.

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

## 1. Running the tests — ask first

Run from `cd Test`:

| Suite | Command | How many |
|---|---|---|
| Everything | `npm test` | 50 Vitest specs + 13 Go files |
| Server API | `npm run test:server` — `vitest --config vitest.server.config.ts` | 28 |
| MCP tools | `npm run test:tools` — `vitest --config vitest.tools.config.ts` | 18 |
| Device broker | `npm run test:dhcp` — `vitest --config vitest.dhcp.config.ts` | 4 |
| Go DNS engine | `npm run test:web` — `cd ../Web && go test -v -count=1 ./...` | 13 files |

`npm run coverage` covers all four. `npm run coverage:web` is
`go test -coverprofile + go tool cover -func`. Watch modes exist as `npm run
test:server:watch`, and the same for `:tools` and `:dhcp`.

## 2. Where things live — mirror the source tree

Put each new spec next to its siblings, following the same folder shape as the code it covers.
`Test/server/` mirrors `server/source/` and has fakes in `server/_testUtils/` — `fakeMongo`,
`fakeRedis`, `fakeAmqp`, `fakeReply`, `fakeRequest`, `mockContainer`. `Test/tools/` mirrors
`tools/source/` and has `fakeHttp` and `fakeMcpServer` in `tools/_testUtils/`.
`Test/dhcp/` mirrors `DHCP/src/`. `Test/shared/` holds shared setup.

## 3. How tests are written

- **Vitest 4.1** with `@vitest/coverage-v8`. Import from `vitest` — there are no globals.
- **Nothing real is ever connected.** The files in `_testUtils` are stand-ins for MongoDB,
  Redis, RabbitMQ, Fastify's `request` and `reply`, the MCP server and the DI container.
  Tests must never reach for a real service, and must never need one running.
- `fakeReply` and `fakeRequest` stand in for Fastify's objects, so a service is called with
  the same arguments it gets in real use.
- Test a service at its seams. A class that takes its collaborators as arguments should be
  testable with fakes, not a whole running system.
- **Name the test after the behaviour, not the function.**
  `it('answers 0.0.0.0 when the service is switched off')` is far better than
  `it('test servicestatus')`.

```typescript
// GOOD — behaviour named, collaborators faked, nothing real needed
import { describe, it, expect, vi } from 'vitest';

describe('ServiceStatusChecker', () => {
  it('answers 0.0.0.0 when the service document says inactive', async () => {
    const cache = { get: vi.fn().mockResolvedValue(null) };
    const collections = {
      service: { findOne: vi.fn().mockResolvedValue({ Service_Status: 'inactive' }) },
    };

    const result = await new ServiceStatusChecker(cache, collections).check(ctx, 'example.com');

    expect(result.ok).toBe(true);
    expect(result.address).toBe('0.0.0.0');
  });
});
```

## 4. Go tests

`cd ../Web && go test ./...` · `cd ../Web && go test -run TestWildcard ./internal/cache/ -v`
for one test · `cd ../Web && gofmt -l .` because `_test.go` files must be formatted too.

What is already covered: `cache/acl_test.go` checks wildcard rules (`*.example.com`,
`google.*`, `*`, and near-misses) · `cache/cache_test.go` checks reading, writing, expiry and
pub/sub · `dbpool/dbpool_test.go` checks A records, CNAME links, chained CNAMEs, **circular
CNAMEs** and the hop cache · `dnsmsg/dnsmsg_test.go` checks reading and writing DNS packets,
bounds checks and TTL changes · `forwarder/forwarder_test.go` checks the upstream pool,
saturation and status numbers, and `breaker_test.go` checks the circuit breaker opening,
cooling down and testing once · `netutil/localip_test.go` and `socket_test.go` check finding
the LAN address and opening shared sockets · the four `rules/*_test.go` files check
`DefaultTTL` with different number shapes, `servableLocally`, the 5-second memory cache, the
switched-off service, the database being down, how long a block verdict is remembered, and
which status each result gets · `config/keys_test.go` checks the fixed key names and TTL limits.

Easiest places to add more: `internal/dnsmsg` needs nothing at all to run, and
`internal/rules` gets its collaborators through an interface (`AnalyticsPublisher`,
`dnsio.Handler`) so they can be faked without a real database.

## 5. Load testing

`dnsperf -s <lan-ip> -d Test/dnsperf.txt -c 5 -q 50 -l 30`

The number to hold on to: **12,746 queries/second at 3.8 ms average, 0 lost** (49 domains,
warm cache, on a Ryzen 5 5500U laptop). Because the load generator runs on the same machine,
treat that as the lowest acceptable number, not the maximum. See `Web/README.md`.

## 6. Boundaries

**Always** — **write** a test for any behaviour change · use the fakes in `_testUtils` ·
keep every test runnable with no external services and no network · mirror the source folder
structure.

**Ask first** — adding a whole new test project, because it needs a `vitest.*.config.ts`
and a `test:*` script · changing anything in `_testUtils`, since many specs depend on those
shapes.

**Never** — connect to a real MongoDB, Redis or RabbitMQ from a test · delete or skip a
failing test to make the suite pass · commit `coverage/` or `node_modules/`.