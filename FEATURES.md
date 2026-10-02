# NexoralDNS — Feature Inventory

What the software does today. Every item below is implemented and reachable from
the dashboard or the REST API.

---

## 1. DNS Core Engine (`Web/`, Go)

| Feature | Detail |
|---------|--------|
| **UDP :53** | `max(1, NumCPU × 3/4)` listeners sharing the port via `SO_REUSEPORT`, each drained on its own goroutine |
| **TCP :53** | RFC 1035 §4.2.2 2-byte length framing, 30s idle timeout, in-order replies per connection |
| **DoT :853** | RFC 7858, TLS 1.2 minimum. Self-signed RSA-2048 certificate generated in Go via `crypto/x509` on first run, persisted atomically, 730-day validity |
| **4-layer query pipeline** | Service status → access control → local record → upstream forward |
| **CNAME resolution** | Chains followed to depth 10, with circular-reference detection |
| **Upstream forwarding** | 6 public resolvers (Cloudflare ×2, Google ×2, Quad9 unfiltered ×2), shuffled per query, 2s per-upstream timeout, automatic fallthrough |
| **Circuit breakers** | Per upstream: 5 failures in 30s opens the breaker; 30s cooldown then a single half-open probe |
| **Socket multiplexing** | 64 upstream sockets, each covering the full TXID space, so concurrent clients cannot collide |
| **Request deduplication** | `singleflight` collapses concurrent lookups of the same name into one database read, across all three transports |
| **LAN IP rebinding** | Host IP is polled every 10s; UDP listeners rebind automatically on change |
| **Graceful shutdown** | Signal → stop listeners → close forwarder → drain, 10s budget |
| **Performance** | 12,746 QPS at 3.8ms average, 0 lost — see [Performance](#12-performance) |

### Query pipeline layers

1. **Service status** — in-memory memo (5s) → Redis (60s) → MongoDB. If the service
   is disabled, queries are answered `0.0.0.0`. If MongoDB is unreachable, policy
   enforcement is skipped rather than resolution failing.
2. **Access control** — in-memory verdict cache (5s) over Redis ACL sets. A lookup
   failure allows the query, so a Redis outage never blocks the network.
3. **Local record** — Redis first, then a deduplicated MongoDB lookup, following
   CNAME chains. The resolved record is re-cached at the record's own TTL.
4. **Upstream forward** — no local answer means forwarding. Results are cached the
   same way local records are.

---

## 2. Access Control & Blocking

Policies resolve against groups to produce Redis sets, which the engine consults
through a 5-second in-memory verdict cache. A blocked query is answered `0.0.0.0`.

| Capability | Detail |
|------------|--------|
| **Target types** | `single_ip`, `multiple_ips`, `ip_group`, `multiple_ip_groups`, `all` |
| **Block types** | `specific_domains`, `domain_group`, `multiple_domain_groups`, `full_internet` |
| **Policy types** | `user_domain`, `user_internet`, `domain_all`, `domain_user`, `group_based` |
| **Wildcard matching** | Boundary-aware: `*.example.com` blocks the base domain and subdomains but not `notexample.com`; `google.*` blocks by prefix; `*` blocks everything |
| **Domain groups** | Reusable named collections of domains |
| **IP groups** | Reusable named collections of IPs |
| **Immediate propagation** | Policy and group changes reload the ACL cache synchronously; a 60s cron is the backstop |
| **Cross-process invalidation** | The engine subscribes to a Redis `cache:invalidate` channel and drops its own caches on receipt |

### Pre-seeded domain groups

Three one-click blocking lists are seeded into MongoDB at startup and managed
through the same generic access-control API as any other group.

| Group | Domains | Source |
|-------|---------|--------|
| `Adult Content (Anti-Porn)` | 92 | Major adult sites and variants |
| `Ads & Trackers (Anti-Ads)` | 155 | Advertising, analytics, tracking and ad-CDN domains |
| `AI Chat & Generative Tools (Anti-AI)` | 42 | AI assistants, model APIs, and AI coding tools |

---

## 3. Admin REST API (`server/`, port 4773)

Layered Router → Controller → Service behind a DI container, with Swagger UI served
at `/docs` and a 22-permission RBAC model.

| Area | Endpoints |
|------|-----------|
| **Public** | `GET /api/info`, `GET /api/health` |
| **Service info** | `GET /api/service-info` |
| **Auth** | `POST /api/auth/login`, `/logout`, `/refresh-token`, `/change-password`, `GET /api/auth/verify` |
| **Domains** | `POST /api/domains/create-domain`, `GET /api/domains/all-domains`, `DELETE /api/domains/delete` |
| **DNS records** | `POST /api/dns/create-dns`, `GET /api/dns/list/:domain`, `PUT /api/dns/update/:id`, `PUT /api/dns/delete` |
| **Access control** | Policy CRUD + toggle, domain-group CRUD, IP-group CRUD, `POST /api/access-control/cache/invalidate` |
| **Users** | CRUD plus `PATCH /api/users/:userId/reset-password` |
| **Roles** | CRUD plus `GET /api/roles/permissions` |
| **Settings** | Service toggle, default TTL get/set, cache stats, clear one key / clear all |
| **Analytics** | Dashboard data, paginated logs with filters, log export (request/status/download) |
| **Devices** | `GET /api/dhcp/list-of-available-ips`, `GET /api/dhcp/refresh-connected-ips` |

Cross-cutting: CORS, a global 100 req/min/IP rate limit, 50MB body limit, and a
uniform `{statusCode, message, data}` response envelope.

---

## 4. Dashboard (`client/`, port 4000)

| Page | Capabilities |
|------|-------------|
| **Overview** | Query/domain/record counts, success and failure rates, average response time, latest queries, network overview, system status — polls every 30s |
| **Domains** | Domain CRUD, DNS record CRUD with TTL and type, block and delete confirmation flows |
| **Access Control** | Three tabs — Policies, Domain Groups, IP Groups — plus manual cache invalidation |
| **Cache** | Paginated Redis key inspection with search, type filtering, and clear-one / clear-all |
| **Logs** | Filter by client IP, query name, time range, status and duration; paginated; async TXT export |
| **Devices** | Connected-device list with a per-device block action |
| **Users** | Users and Roles tabs, password-strength meter, admin password reset |
| **Settings** | Service on/off, default TTL presets and manual entry, server configuration |
| **Profile** | Self-service account and password management |

Also: permission-gated sidebar that mirrors the backend guard codes exactly, a
forced password-change gate for new and reset accounts, light/dark theming, and a
shared UI kit (buttons, inputs, tag inputs, toasts, spinners, confirmation modals).

---

## 5. Users, Roles & Authentication

| Capability | Detail |
|------------|--------|
| **RBAC** | 22 permission codes across domains, DNS records, access control, users, roles, settings and logs |
| **Seeded roles** | Super Admin, Admin, Moderator, User, Guest |
| **Custom roles** | Any subset of the permission catalog |
| **Full Access** | Permission code 4 bypasses every check |
| **Sessions** | JWT access token (30 min) and refresh token (48h), stored in httpOnly cookies, one session document per user with a 48h TTL index |
| **Login throttling** | 10 attempts / 15 min / IP; token refresh 20 / 15 min |
| **Password policy** | Minimum 8 characters with upper, lower and digit — enforced identically on create, admin reset and self-service change |
| **Forced rotation** | New, bootstrap and admin-reset accounts must change password before reaching the dashboard |
| **Self-lockout guards** | An admin cannot deactivate, demote or delete their own account |
| **Immediate invalidation** | An admin password reset kills the target's session in both Redis and MongoDB |

---

## 6. Monitoring & Analytics

| Capability | Detail |
|------------|--------|
| **Query logging** | Every query recorded with name, type, client IP, status, source, timestamp and duration |
| **Async pipeline** | Published to RabbitMQ in a fire-and-forget goroutine, batch-consumed (1000 / 2s) and inserted into MongoDB |
| **Retention** | 7 days, enforced by a MongoDB TTL index — cleanup needs no cron |
| **Dashboard stats** | 24-hour counts, status breakdown, top forwarders with percentages, weighted average response time |
| **Log export** | Asynchronous TXT export streamed to disk through a queue, with per-user status polling, hourly cleanup of files older than 24h, and self-healing if the file is already gone |
| **Cache statistics** | Redis key counts and sizes for the dashboard's cache inspector |

---

## 7. Connected-Device Inventory

Not a DHCP server — a LAN scanner that inventories devices.

| Capability | Detail |
|------------|--------|
| **Subnet sweep** | Every 2 minutes, deriving the usable IP range from the interface netmask and pinging in parallel batches |
| **Enrichment** | Reverse DNS, ARP table lookup, own-MAC injection, and a repeated ARP poll to resolve pending MAC addresses |
| **Network details** | WiFi SSID, local IP, subnet mask and IP range captured alongside the device list |
| **Persistence** | Written into the `service` document with connected/disconnected timestamps and a total device count |
| **Blocking** | A device can be targeted directly from the dashboard, creating an access-control policy |
| **Host DNS upkeep** | The broker polls its own LAN address every 10s, republishes it over Redis, and rewrites `/etc/resolv.conf` so the host keeps resolving through itself |

---

## 8. MCP Tool Server (`tools/`, port 4774)

54 tools over the Streamable HTTP transport, so any MCP-compatible client can manage
the server through the same authenticated REST API the dashboard uses.

| Group | Tools |
|-------|-------|
| Public | 2 — server info, health |
| Auth | 2 — change password, verify session |
| Domains | 3 |
| DNS records | 4 |
| Users | 6 |
| Roles | 6 |
| Access control | 16 |
| Devices | 2 |
| Settings | 6 |
| Analytics | 5, including log export download |

Properties: OAuth 2.1 with PKCE and dynamic client registration; a browser sign-in
page; no login or logout tool and no tool that accepts a password, so credentials
never reach the model; a health gate before every authenticated call; password-shaped
arguments redacted from logs; large responses truncated to protect model context.

---

## 9. Caching

| Layer | Behaviour |
|-------|-----------|
| **Record cache** | Redis, keyed per query name, TTL taken from the record |
| **Service status** | Redis plus a 5s in-process memo |
| **Block verdicts** | In-memory map, 5s TTL, swept at 10,000 entries |
| **CNAME hops** | In-memory, 3s TTL, swept at 10,000 entries, shared across all query goroutines |
| **ACL sets** | Rebuilt from policies every 60s, plus immediately on any mutation |
| **Dashboard stats** | 30-minute cache recomputed every 5 minutes, merged with live data on read |
| **Sessions** | Redis, 30-minute TTL, explicitly evicted on logout, refresh, password change and re-login |
| **MongoDB pool** | CPU-scaled per worker against a 200-connection cluster budget, with a 300 absolute aggregate cap |

---

## 10. Clustering & Resilience

- The API runs `max(1, floor(cpus × 0.75))` clustered workers with round-robin
  scheduling. Cron jobs, index creation and RBAC seeding run in the primary only.
- The DNS engine reaches the same parallelism in a single Go process using
  `SO_REUSEPORT` rather than forking.
- The JWT secret is generated once in the primary before forking, race-safe across
  workers.
- **Degradation, not failure:** a MongoDB outage bypasses policy enforcement but
  still resolves; a Redis ACL error fails open; a RabbitMQ outage never delays an
  answer. Losing all DNS on a LAN is worse than briefly missing a blocklist.
- Independent infrastructure shutdown via `allSettled`, so one unavailable service
  cannot block the others from closing cleanly.

---

## 11. Deployment

| Path | Detail |
|------|--------|
| **Docker** | `network_mode: host` with `NET_ADMIN`, MongoDB/Redis/RabbitMQ as siblings, healthchecked. Entrypoint raises the UDP socket buffer ceiling to 4MB and restarts the engine in a supervised loop |
| **Bare metal** | `install.sh` installs Node, PM2 and services directly, with a `nexoraldns start/stop/update/pack/remove` CLI |
| **Processes** | Four PM2-managed processes — API, dashboard, device broker, MCP server — plus the Go engine, which runs under its own restart loop because a compiled binary needs no process manager |
| **Platforms** | Debian/Ubuntu, `amd64`/`arm64`/`i386` release artifacts, container image on `ghcr.io` |

---

## 12. Performance

Measured with `dnsperf` over UDP:53 against `Test/dnsperf.txt` (49 domains, warm cache):

| Load shape | QPS | Average latency | Lost |
|-------------|-----|-----------------|------|
| 5 clients, 50 in flight | **12,746** | 3.8 ms | 0 |
| 8 threads, 2000 in flight | 10,396 | 189 ms | 95 (0.03%) |

Test hardware: AMD Ryzen 5 5500U (6C/12T), 7.1 GiB RAM, Linux 6.8, Docker `host`
networking, with MongoDB, Redis, RabbitMQ **and the load generator** co-located.

Because the load generator competes for the same cores, **12,746 is a floor rather
than a ceiling**. At 2000 in flight the added latency matches Little's Law almost
exactly (2000 ÷ 10,396 ≈ 192 ms) — that run measures the queue, not the engine.

Scaling beyond this is bounded by hardware and domain concentration. MongoDB, not
the DNS engine or Redis, is the limiting factor under sustained cache-miss-heavy load.

Reproduce:

```bash
dnsperf -s <lan-ip> -d Test/dnsperf.txt -c 5 -q 50 -l 30
```

---

## 13. Testing

| Suite | Coverage |
|-------|----------|
| `Test/server/` (28 specs) | Middlewares, database, helpers, Redis, DI container, logs service, RabbitMQ |
| `Test/tools/` (18 specs) | All ten tool-registration groups, API client, health monitor, OAuth provider |
| `Test/dhcp/` (4 specs) | Config, IP scanner, resolv.conf writer |
| `Web/**/*_test.go` (13 files) | ACL wildcard matching, CNAME chains including circular references, forwarder and circuit breakers, wire format, sockets, pipeline layers, analytics |

All infrastructure is faked — no test requires a live MongoDB, Redis or RabbitMQ.
CI runs every suite with coverage, plus `go build`, `go vet` and a `gofmt` gate,
and **blocks the container image push if any check fails**.

---

## 14. Not Included

Stated plainly, so nothing here reads as an oversight:

- **No domain rerouting or rewriting** — there is no logic that redirects `google.com`
  to a custom target.
- **No per-user subscription plan gating** in the query path.
- **No live latency percentiles** — query data is queryable after the fact, but there
  is no p50/p95/p99 dashboard or metrics exporter.
- **No rate limiting on the DNS query path** — the UDP transport spawns a goroutine per
  datagram with no admission control, so saturation is bounded by memory.
- **No DNSSEC**, and AAAA records are forwarded upstream rather than answered locally.
- **No IPv6 transport** — the engine binds IPv4.