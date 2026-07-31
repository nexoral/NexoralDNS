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
  dnsmsg/            DNS wire format encode/decode
  dnsio/             per-transport send/parse handlers
  netutil/           address discovery, SO_REUSEPORT sockets, IP scanner
  cache/ database/ dbpool/
  rules/             the query pipeline
  forwarder/         upstream forwarding, socket pool, circuit breakers
  server/            UDP, TCP and DoT listeners
```

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

## Testing

There are no tests yet. When adding them, note that Go requires `_test.go` files
to live in the package directory they test. `internal/dnsmsg` is the place to
start: its bounds checks replace behaviour JavaScript got from `try/catch`, so a
mistake there means a malformed packet panics the server.

```bash
go build ./... && go vet ./...
```

## Verifying a running server

```bash
dig @<lan-ip> example.com              # UDP
dig @<lan-ip> +tcp example.com         # TCP framing
kdig +tls @<lan-ip> -p 853 example.com # DoT
```
