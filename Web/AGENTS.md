# AGENTS.md — `Web/` (the DNS server, in Go)

How to work on the Go DNS server. Read `Web/README.md` first — it walks through one lookup from start to finish. This file is the shorter rulebook.

---

## Working agreement — ask, don't assume

**These three rules come first. They override everything else in this file.** Full detail: root [`AGENTS.md`](../AGENTS.md) section 2.

**1. Tests are opt-in.** Say which command you want to run, say why, wait for a yes. Permission covers only that moment — ask again next task, and before any *new* command. No permission needed for `go build`, `go vet`, `gofmt -l`; they change nothing.

**2. Ask when you are not sure — even mid-task.** Ask if the request is unclear, two files disagree, the code does not support what you were asked, you would have to invent an API to continue, or you are about to delete something you did not create. Being wrong 200 lines in costs far more than one early question. Prefer the smallest change you can undo. Reading code to answer a question is research, not a guess — making up behaviour is a guess.

**3. Check graphify before using it.** Run `test -d graphify-out && command -v graphify >/dev/null && echo "graphify available"`. Use `graphify query "<q>"` **only** if that prints `graphify available`; otherwise just use grep/glob/read normally — no comment needed, it is not an error.

---

## 1. Check your work

Without asking: `go build ./... && go vet ./... && gofmt -l .` — `gofmt -l .` **must print nothing**, CI fails if it does. Fix with `gofmt -w`.

**Ask first:** `go test ./...`, or `cd ../Test && npm run test:web`. Then `go test -run TestWildcard ./internal/cache/ -v` for one test, or `go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out` for coverage.

## 2. How the code is layered

Dependencies point **inward** — the bottom layer knows nothing about the top one.

```
   server/          →  rules/  →  dnsmsg/
   (UDP/TCP/DoT)       (logic)    (wire format, knows nothing else)
        ↓                 ↓
     dnsio/          cache/ dbpool/ forwarder/
   (the port)        (things it talks to)

              app/  ← starts everything up
```

- **`dnsmsg` imports nothing of ours.** It only moves bytes around. That is why it is the easiest package to test — no database, no sockets needed.
- **`rules` never mentions UDP, TCP or TLS.** It talks to a `dnsio.Handler` interface. That is how one set of rules serves all three ways of connecting. A fourth transport means one new adapter and no changes in `rules/`.

Everything is wired up in `internal/app/app.go`. That file works like a DI container — a mistake there is a compile error, which is the point. Do not add global variables.

---

## 3. Rules for the lookup path

The lookup has **4 steps**: service on/off → blocked? → local record → ask upstream. All in `internal/rules/pipeline.go`.

```go
// GOOD — recover inside the goroutine we started
go func() {
    defer func() {
        if r := recover(); r != nil {
            slog.Error("panic in query goroutine", "err", r)
        }
    }()
}()
```

That inner `recover()` is **load-bearing**. A panic cannot jump from one goroutine to another, so the one in `Execute` alone will not protect this process. Without the inner one, a single malformed packet could take down every listener. Never remove it.

- **Let the lookup succeed when something breaks.** MongoDB down → skip the service check and the block check, but still answer from cache or upstream. Rule sets unreadable → allow the request. A whole network losing DNS is worse than briefly missing a block.
- **Keep logging cheap.** The "one line per query" log is `Debug`, not `Info`. At real traffic it is the most expensive thing on this path. Do not promote it.
- **Never make the lookup wait for logging.** Query stats go out in a background goroutine. Never wait for RabbitMQ here.
- **There is no limit on incoming queries.** `internal/server/udp.go` starts a goroutine per packet with nothing limiting it. Under overload, memory runs out first, not a limiter. Do not add a blocking check without measuring.
- **Each lookup gets 5 seconds.** It races against a timer. If time runs out, the answer is `0.0.0.0`.

### One guard that looks wrong but is not

`servableLocally()` in `pipeline.go` only answers A-records. AAAA records — even ones we have cached — are deliberately passed on to upstream. Reason: `ipv4Bytes()` cannot write an AAAA address, so the server would answer `0.0.0.0` and break dual-stack devices. Do not "fix" this by widening it.

## 4. Forwarding to other DNS servers

In `internal/forwarder/`:

- **64 shared sockets.** Each handles all 65,536 possible transaction IDs. The server *creates* transaction IDs rather than reusing the client's, so two devices asking at the same time cannot be confused for each other. The client's original ID is put back before the answer goes out.
- This replaced a single shared socket after a real problem: 20 simultaneous queries on one socket dropped 19 of them. One socket per query fixed that but did not scale. The code comments explain why the current design won — read them before changing it.
- `QueueDepth()` always returns `0`. Sockets are shared, not queued.
- Each upstream has a circuit breaker: 5 failures in 30 seconds trips it, then 30 seconds later exactly one test request is allowed through. If that test fails, it trips again.
- `Status()` reports real numbers (`activeForwards`, `successRate`, breaker states) but **nothing reads it and no endpoint shows it**. Do not assume it is live.

## 5. Cache lifetimes — keep these in one place

Service on/off memory 5s (`rules/servicestatus.go`) · block verdicts 5s, swept at 10,000 (`rules/blocklist.go`) · CNAME link cache 3s, swept at 10,000 (`dbpool/dbpool.go`) · Redis record cache lasts as long as the record says (`cache/cache.go`).

`DefaultTTL()` accepts `float64`, `int32`, `int64` and `int`, because MongoDB and Redis return the same field in different shapes. Do not narrow it to one.

## 6. Go words you will see here

`go someFunc()` runs `someFunc` in the background and moves on — used once per query so a slow lookup never blocks the socket. `recover()` catches a panic, like `catch` in JavaScript; it only works inside `defer` and only on its own goroutine (section 3). `context.Context` is the "stop if we run out of time" signal passed as the first argument. `chan` and `select` — a channel is a pipe, `select` waits on several at once — race the lookup against its timeout. `atomic.Pointer` in `dnsio/udp.go` swaps the socket when the IP changes while queries are still running, with no lock. `singleflight` in `rules/rules.go` means that if 500 lookups for the same name miss the cache at once, only **one** database read happens and all 500 share it.

## 7. Settings

`MONGO_URI` (default `mongodb://localhost:27017`) · `MONGO_DB_NAME` (`nexoral_db`) · `REDIS_URI` (`redis://localhost:6379`) · `RABBITMQ_URI` (`amqp://localhost:5672`) · `LOG_LEVEL` (`info`, or `debug`/`warn`/`error`) · `DOT_CERT_DIR` (`/etc/nexoral/cert`) · `DEBUG_DNS` (unset; when set, logs every upstream query).

DoT certificates are made in Go using `crypto/x509` — **not** by calling `openssl`. They are written with `atomicWrite` (write to a temp file, sync, then rename). `os.WriteFile` on an existing file keeps the old permissions, which is the bug `atomicWrite` avoids. Do not simplify it away.

## 8. Boundaries

**Always** — keep `dnsmsg` free of our own imports · keep `rules` free of transport details · keep the double `recover()` · run `gofmt -l .` and `go build ./...` before reporting done.

**Ask first** — changing the upstream server list or circuit-breaker settings · changing TTL limits (`minTTL=10`, `fallbackTTL=300`) · changing the listener count formula (`max(1, NumCPU*3/4)`) · anything in `internal/dnsmsg/`.

**Never** — bind TCP to `0.0.0.0:53`; that collides with `systemd-resolved` on `127.0.0.53`, so TCP binds the LAN address on purpose · add a second `singleflight.Group` · delete `Web/shared/`, which is a deliberate Go copy of `shared/source/`, not a mistake to clean up.