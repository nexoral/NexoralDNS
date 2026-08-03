# Web — NexoralDNS Core DNS Server

The core DNS server, written in Go. Serves DNS over UDP:53, TCP:53 and TLS:853.

> **LAN only.** Do not expose this on a public network. ISPs block the DNS
> behaviour it relies on, and an open resolver is an amplification vector.

## Build and run

```bash
go build -o web .
sudo ./web          # ports 53 and 853 require root
```

In Docker this is built by the `go-builder` stage in the repo's `Dockerfile` and
started by `Scripts/docker-entrypoint.sh`. It is deliberately **not** managed by
pm2 — pm2 supervises the Node services, and a compiled binary only needs a
restart loop.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DB_NAME` | `nexoral_db` | Database name |
| `REDIS_URI` | `redis://localhost:6379` | Redis connection string |
| `RABBITMQ_URI` | `amqp://localhost:5672` | Broker for the analytics queue |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `DOT_CERT_DIR` | `/etc/nexoral/cert` | Where the DoT certificate is stored |
| `DEBUG_DNS` | unset | Log every upstream forward |
| `SERVICE_API_KEY`, `CLOUD_URL` | unset | Optional service configuration |

Set `LOG_LEVEL=debug` to log every incoming query. It is off by default: at
production query rates that single line is the most expensive thing on the path.

## Layout

```
main.go              entrypoint and signal handling
shared/              infrastructure layer
  keys/              cache keys, queue names, status labels
  logger/            structured JSON logging
  mongo/ redis/ rabbitmq/
internal/            this service only
  config/            collection names and seed values
  app/               dependency wiring
  dnsmsg/            DNS wire format
    dnsmsg.go        Record type and shared constants
    build.go         writing an answer packet
    parse.go         reading a query or upstream response
    ttl.go           rewriting TTLs in a formed response
  dnsio/             per-transport send/parse handlers
  netutil/           address discovery, SO_REUSEPORT sockets, IP scanner
  cache/ database/ dbpool/
  rules/             the query pipeline
    rules.go         the StartRules type, wiring, cache invalidation
    pipeline.go      the query path, layer by layer
    analytics.go     per-query telemetry
    servicestatus.go layer 1
    blocklist.go     layer 2
  forwarder/         upstream forwarding, socket pool, circuit breakers
  server/            UDP, TCP and DoT listeners
```

## Architecture

The layering is ports-and-adapters. Every dependency arrow points **inward**:

```
   server/          →  rules/  →  dnsmsg/
   (UDP/TCP/DoT)       (logic)    (wire format, depends on nothing)
        ↓                 ↓
     dnsio/          cache/ dbpool/ forwarder/
   (the port)        (outbound adapters)

              app/  ← composition root, wires it all once
```

Two consequences worth internalising:

- **`dnsmsg` imports none of our packages.** It is pure byte manipulation, which
  is why it is the one package with unit tests — it needs no running database.
- **`rules` never mentions UDP, TCP or TLS.** It depends on the `dnsio.Handler`
  interface (`internal/dnsio/handler.go`). That single indirection is why one
  pipeline serves all three transports; adding a fourth means writing one new
  adapter and touching nothing in `rules/`.

## Follow one query end to end

Start here when you need to find where something happens.

| # | What happens | Where |
|---|---|---|
| 1 | Process starts, traps signals | `main.go:28` |
| 2 | Every service constructed in dependency order | `internal/app/app.go:46` |
| 3 | Infra connects, three transports bind | `internal/app/app.go:99` |
| 4 | A datagram arrives; buffer is copied | `internal/server/udp.go:83` |
| 5 | Query dispatched onto its own goroutine | `internal/server/udp.go:113` |
| 6 | 5s timeout + panic guard wrap the query | `internal/rules/pipeline.go:33` |
| 7 | The four layers run in order | `internal/rules/pipeline.go:65` |
| 8 | **Layer 1** — DNS service on/off? | `internal/rules/servicestatus.go:80` |
| 9 | **Layer 2** — is this domain blocked for this client? | `internal/rules/blocklist.go:63` |
| 10 | **Layer 3** — local record: Redis, then Mongo | `internal/rules/pipeline.go:155` |
| 11 | …Mongo lookup, following CNAMEs | `internal/dbpool/dbpool.go:51` |
| 12 | **Layer 4** — no local answer, ask upstream | `internal/rules/pipeline.go:185` |
| 13 | …shuffled resolver pool behind circuit breakers | `internal/forwarder/forwarder.go:97` |
| 14 | Answer written back to the client socket | `internal/dnsio/udp.go:27` |
| 15 | …the actual bytes of the reply packet | `internal/dnsmsg/build.go:12` |

Steps 8–12 each either **answer and return**, or fall through to the next. That
is the whole design; everything else is detail.

## Go idioms used here

If Go is not your daily language, these five account for most of what looks
unfamiliar in this codebase.

**`go someFunc()`** — runs `someFunc` concurrently and moves on immediately.
`internal/server/udp.go:113` does this per datagram, so a slow query never blocks
the socket read loop.

**`defer`** — schedules a call for when the current function returns, no matter
how it returns. Used for cleanup (`defer cancel()`) and for panic guards.

**`recover()`** — catches a panic, Go's nearest equivalent to `catch`. It only
works inside a `defer`, and only on its *own* goroutine — which is why
`internal/rules/pipeline.go` installs one in `Execute` **and** another inside the
goroutine it spawns. Miss the second and one bad packet kills the process.

**`context.Context`** — the cancellation signal threaded through every call.
`context.WithTimeout` gives the query 5 seconds; when it expires, every operation
holding that context aborts. The `ctx` first parameter everywhere is this.

**`chan` and `select`** — a channel is a typed pipe; `select` waits on several at
once and takes whichever is ready first. `Execute` races the query against its
timeout this way: whichever fires first wins.

Two more that appear less often but matter:

- **`atomic.Pointer[T]`** (`internal/dnsio/udp.go`) — lets the IP scanner swap
  the socket out while queries are mid-flight, without a lock.
- **`singleflight`** (`internal/rules/rules.go`) — if 500 queries for the same
  domain miss the cache at once, exactly one database read happens and all 500
  share its result.

## Query pipeline

1. **Service status** — memory (5s), then Redis, then MongoDB. Unreachable means
   fail-safe: access controls are bypassed and queries forward upstream rather
   than being dropped.
2. **Access control** — in-memory verdict cache (5s) over the Redis ACL sets.
   A lookup failure fails open, so a Redis outage still leaves records resolvable.
3. **Local record** — Redis, then MongoDB with CNAME chains followed to depth 10.
   Concurrent lookups for one name collapse into a single database read.
4. **Upstream** — six public resolvers, shuffled, each behind a circuit breaker.

## Concurrency

One process. It opens one UDP socket per ~75% of CPUs, all sharing port 53 via
`SO_REUSEPORT`, so the kernel spreads datagrams across them, and drains each on
its own goroutine. Every query is then handled on a goroutine of its own, with a
5s budget and a `recover` at the boundary so one malformed packet cannot take
down every listener.

TCP and DoT serve one goroutine per connection, answering that connection's
queries in order.

## Performance

`dnsperf` against `../Test/dnsperf.txt` (49 domains, warm cache) over UDP:53:

| Load shape | QPS | Avg latency | Lost |
|---|---|---|---|
| 5 clients, 50 in flight | **12,746** | 3.8 ms | 0 |
| 8 threads, 2000 in flight | 10,396 | 189 ms | 95 (0.03%) |

Test bed: AMD Ryzen 5 5500U (6C/12T), 7.1 GiB RAM, Linux 6.8, Docker `host` network
with no CPU limit, loopback transport — MongoDB, Redis, RabbitMQ and `dnsperf`
itself all on the same box.

The gentler run wins on both axes. At 2000 in flight the load generator is
fighting the server for cores and the deep queue adds wait time Little's Law
predicts almost exactly (2000 ÷ 10,396 ≈ 192 ms) — that run measures the queue,
not the engine. Since the generator is co-located, **12,746 is a floor.**

Reproduce:

```bash
dnsperf -s <lan-ip> -d ../Test/dnsperf.txt -c 5 -q 50 -l 30
```

Note there is no per-IP rate limiting on the query path — `internal/server/udp.go`
spawns a goroutine per datagram with no admission control, so a saturation run is
bounded by memory, not by a limiter.

## Testing

There are no tests yet.

```bash
go build ./... && go vet ./...
```

When adding them, note that Go requires `_test.go` files to live in the package
directory they test — they cannot go in the repo's `Test/` folder the way the
Node suites do.

`internal/dnsmsg` is the place to start: it depends on nothing (no database, no
sockets), so it is testable in isolation, and its bounds checks replace behaviour
JavaScript got from `try/catch` — a mistake there means a malformed packet panics
the server. `internal/rules` is the natural second target, since its collaborators
are already interfaces (`AnalyticsPublisher`, `dnsio.Handler`) and can be faked
without standing up Mongo or Redis.

## Verifying a running server

```bash
dig @<lan-ip> example.com              # UDP
dig @<lan-ip> +tcp example.com         # TCP framing
kdig +tls @<lan-ip> -p 853 example.com # DoT
```
