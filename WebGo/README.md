# WebGo — NexoralDNS Core DNS Server (Go)

A Go port of `Web/`, serving DNS over UDP:53, TCP:53 and TLS:853.
`Web/` is untouched; both can be built and compared side by side.

> **LAN only.** Do not expose this on a public network. ISPs block the DNS
> behaviour it relies on, and an open resolver is an amplification vector.

## Build and run

```bash
go build -o webgo .
sudo ./webgo          # ports 53 and 853 require root
```

## Environment

Identical to the TypeScript build — no new variables, no renames.

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

## Layout

```
main.go              entrypoint and signal handling
shared/              infrastructure layer (port of nexoraldns-shared)
  keys/              cache keys, queue names, status labels
  logger/            structured JSON logging
  mongo/ redis/ rabbitmq/
internal/            this service only
  config/            collection names and seed values
  app/               dependency wiring
  dnsmsg/            DNS wire format encode/decode
  dnsio/             per-transport send/parse handlers
  netutil/           address discovery, SO_REUSEPORT sockets, IP scanner
  cache/ database/ dbpool/
  rules/             the query pipeline
  forwarder/         upstream forwarding, socket pool, circuit breakers
  server/            UDP, TCP and DoT listeners
```

## Query pipeline

1. **Service status** — Redis, then MongoDB. Unreachable means fail-safe: access
   controls are bypassed and queries forward upstream rather than being dropped.
2. **Access control** — in-memory verdict cache over the Redis ACL sets.
3. **Local record** — Redis, then MongoDB with CNAME chains followed to depth 10.
   Concurrent lookups for one name collapse into a single database read.
4. **Upstream** — six public resolvers, shuffled, each behind a circuit breaker.

## Concurrency

The Node build forked one worker per 75% of CPUs. This build stays in one
process: it opens the same number of UDP sockets on port 53 with `SO_REUSEPORT`
so the kernel spreads datagrams across them, drains each on its own goroutine,
and handles every query on a goroutine of its own. TCP and DoT serve one
goroutine per connection, answering that connection's queries in order.

## Verification

```bash
go build ./... && go vet ./...

dig @<lan-ip> example.com              # UDP
dig @<lan-ip> +tcp example.com         # TCP framing
kdig +tls @<lan-ip> -p 853 example.com # DoT
```

Tests are not written yet. When they are, `internal/dnsmsg` is the place to
start: its bounds checks replace behaviour the TypeScript got from `try/catch`,
so a mistake there means a malformed packet panics the server.

> Do not run this alongside the Node `Web/` server. Both bind UDP:53 with
> `SO_REUSEPORT`, so the kernel splits queries between them.
