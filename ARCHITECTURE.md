# NexoralDNS Complete Architecture Documentation

## 📖 Table of Contents
1. [System Overview](#system-overview)
2. [Flow Diagrams](#flow-diagrams)
3. [System Component Architecture](#system-component-architecture)
4. [Directory Structure](#directory-structure)
5. [Core Service Responsibilities](#core-service-responsibilities)
6. [Cluster & Concurrency Model](#cluster--concurrency-model)
7. [Database Schema](#database-schema)
8. [Redis Caching Strategy](#redis-caching-strategy)
9. [RBAC & User Management](#rbac--user-management)
10. [Pre-Seeded Blocking Groups](#️-pre-seeded-blocking-groups)
12. [Performance Targets](#performance-targets)
13. [Operational Resilience](#operational-resilience)
14. [Known Gaps & Non-Goals](#known-gaps--non-goals)
15. [Testing](#testing)
16. [MCP Tool Server (tools/)](#mcp-tool-server-tools)
17. [Deployment](#deployment)
18. [Security Considerations](#security-considerations)
19. [Future Optimizations](#future-optimizations)
20. [Support & Maintenance](#support--maintenance)

---

## System Overview

NexoralDNS is a LAN-only DNS server and management system with:
- **Sub-5ms query response targets** (cache hit / DB lookup), backed by a Redis-first, MongoDB-fallback resolution pipeline
- **Three DNS transports**: UDP (port 53), TCP (port 53, RFC 7766), and DoT — DNS over TLS (port 853, RFC 7858) — all sharing the same query-processing logic
- **Domain blocking** via an Access Control List (ACL) system: per-IP, per-group, or global policies, plus three pre-seeded domain groups (Anti-Porn, Anti-Ads, Anti-AI) usable as one-click starting points
- **Analytics** for query monitoring, published async via RabbitMQ and batch-written to MongoDB
- **Multi-worker clustering** for multi-core utilization
- **RBAC-based admin dashboard** (users, roles, permissions) for managing the above

> **Not currently implemented**: domain rerouting/rewriting (e.g. redirecting `google.com` → a custom target) and per-user subscription plan gating in the DNS query path. Earlier drafts of this document described both in detail; neither exists in the current codebase (`Web/`, `server/source`) — there is no rewrite/reroute logic and no plan-check anywhere in the query path. If/when built, this document should be updated alongside the code.

---

## Flow Diagrams

### 1. High-Level DNS Query Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT DNS QUERY                             │
│              UDP:53 · TCP:53 (RFC 7766) · DoT:853 (RFC 7858)         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      server/udp.go    server/tcp.go       server/dot.go     
      (N×SO_REUSEPORT) (net.Listener)      (tls.Listener)
              │                │                │
              └────────────────┼────────────────┘
                               ▼
              All three transports parse via the same
              dnsio.Handler interface and dispatch into:
┌─────────────────────────────────────────────────────────────────────┐
│              StartRules.Execute() — internal/rules/rules.go          │
│                  (one shared instance, identical per transport)      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   [CACHE HIT]           [DB LOOKUP]           [UPSTREAM FORWARD]
   Redis record hit      MongoDB record,       No local record —
                          single-flight-deduped forwarded over a 64-socket
                          (CNAME chains to      multiplexing pool using
                          depth 10)             generated TXIDs, to a
                                                shuffled 6-IP pool
                                                (Cloudflare, Google,
                                                Quad9 unfiltered), 2s
                                                per-server timeout, each
                                                upstream behind its own
                                                circuit breaker
```

### 2. Actual Query Processing Flow (4 checks, not the previously-documented 7)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING DNS QUERY                           │
│                  Client IP: 192.168.1.5 | Domain: google.com        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ CHECK 1: SERVICE    │  Redis (dns-server-status),
                    │ STATUS              │  falls back to MongoDB
                    └──────────┬──────────┘  `service` collection on
                               │              cache miss
                    ┌──────────▼──────────┐
                    │  Service Active?    │
                    └──┬──────────────┬───┘
                  NO   │              │ YES
           ┌───────────▼─────┐        │
           │ Return 0.0.0.0  │        │
           └─────────────────┘        │
                                      │
                           ┌──────────▼──────────┐
                           │ CHECK 2: BLOCK LIST │  in-memory verdict map (5s)
                           │ (ACL)               │  over the Redis ACL sets:
                           └──────────┬──────────┘  exact sets first via
                                      │              SISMEMBER (O(1)), then
                           ┌──────────▼──────────┐  the small wildcard sets,
                           │   Domain Blocked?   │  with wildcard matching
                           └──┬──────────────┬───┘
                          YES │              │ NO
                   ┌──────────▼─────┐        │
                   │ Return 0.0.0.0 │        │
                   │ (fail-open on  │        │
                   │  ACL errors)   │        │
                   └────────────────┘        │
                                             │
                                  ┌──────────▼──────────┐
                                  │ CHECK 3: RECORD     │  Redis GET first;
                                  │ CACHE / DB          │  on miss, single-
                                  └──────────┬──────────┘  flight-deduped
                                             │              MongoDB findOne,
                                  ┌──────────▼──────────┐   walking CNAME
                                  │  Record Found &     │   chains up to
                                  │  Name Matches?       │   10 hops
                                  └──┬──────────────┬───┘
                                YES  │              │ NO
                         ┌───────────▼─────┐        │
                         │ Build & Send    │        │
                         │ Answer, Re-cache│        │
                         │ at record's TTL │        │
                         └─────────────────┘        │
                                                     │
                                          ┌──────────▼──────────┐
                                          │ CHECK 4: UPSTREAM   │  Shuffled
                                          │ FORWARD             │  multi-provider
                                          └──────────┬──────────┘  pool, 2s
                                                     │              per-server
                                          ┌──────────▼──────────┐   timeout,
                                          │ Cache Response,     │   automatic
                                          │ Return to Client    │   fallthrough
                                          └─────────────────────┘
```

**Fail-safe behavior**: if MongoDB is unreachable at any point in checks 1-3, the pipeline sets a `databaseOffline` flag and bypasses service-status/ACL enforcement rather than hard-failing — queries still resolve (via cache or upstream forward) with reduced policy enforcement, on the reasoning that a LAN losing all DNS resolution is worse than temporarily bypassing blocklists. See `Web/internal/rules/rules.go`.

---

## System Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────────────┐         ┌──────────────────────────────────┐     │
│  │   Web Dashboard        │         │        DNS Clients                │     │
│  │   (Next.js, port 4000) │         │  (any device on the LAN — phones, │     │
│  │                        │         │   laptops, IoT, routers)          │     │
│  └───────────┬────────────┘         └────────────────┬───────────────────┘     │
└──────────────┼───────────────────────────────────────┼─────────────────────┘
               │ HTTP/REST                              │ UDP:53 / TCP:53 / DoT:853
               ▼                                        ▼
┌──────────────────────────────────┐   ┌───────────────────────────────────────┐
│   server/ — Fastify API           │   │   Web/ — Core DNS Engine (Go)          │
│   (port 4773)                     │   │   (1 process, N=cpus×0.75 listeners)  │
│                                    │   │                                       │
│  Router → Controller → Service    │   │  server/udp.go (UDP, reuseport)       │
│  layers for: domains, DNS records,│   │  server/tcp.go (TCP)                  │
│  users, roles, ACL policies,      │   │  server/dot.go (TLS/853)              │
│  domain/IP groups, analytics,     │   │       │                               │
│  settings, health checks          │   │       ▼                               │
│                                    │   │  rules/rules.go (StartRules)          │
│  Own cluster.fork() pool, own     │   │  rules/servicestatus.go               │
│  MongoClient, own RabbitMQ conn   │   │  rules/blocklist.go                   │
│  (connection classes now live in  │   │  dbpool/dbpool.go                     │
│  shared/ — see below)              │   │  forwarder/forwarder.go               │
└─────────────┬──────────────────────┘   │                                       │
              │                          │  Goroutine-per-query, one            │
              │                          │  shared Mongo + RabbitMQ pool        │
              │                          └───────────────┬───────────────────────┘
              │                                          │
              └──────────────────┬───────────────────────┘
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │              Shared backing services              │
        │  ┌──────────────┐ ┌──────────┐ ┌───────────────┐ │
        │  │  MongoDB     │ │  Redis   │ │  RabbitMQ     │ │
        │  │  (single     │ │  (single │ │  (DNS_Analytics│ │
        │  │   instance)  │ │  instance)│ │   queue → batch│ │
        │  │              │ │          │ │   consumer in  │ │
        │  │              │ │          │ │   server/)     │ │
        │  └──────────────┘ └──────────┘ └───────────────┘ │
        └─────────────────────────────────────────────────┘
                                  │
                                  │ Forward on cache/DB miss
                                  ▼
                    ┌────────────────────────────────┐
                    │  UPSTREAM DNS (shuffled pool)   │
                    │  Cloudflare · Google · Quad9    │
                    │  (unfiltered), 6 IPs total      │
                    └────────────────────────────────┘
```

Per `Scripts/docker-compose.yml`, MongoDB/Redis/RabbitMQ/`nexoraldns` (which bundles `Web`, `server`, `client`, `DHCP` via PM2 — see `ecosystem.config.js`) typically run as sibling containers **on one host**, not dedicated hardware per service — relevant when reasoning about capacity, since they compete for the same CPU/memory.

---

## Directory Structure

```
Web/                                 # Core DNS server — a Go module
├── main.go                          # Entrypoint: signal handling, graceful shutdown
├── internal/
│   ├── app/app.go                   # Dependency wiring (replaces the DI container)
│   ├── config/keys.go               # Collection names, defaults, service identity
│   ├── database/collections.go      # Collection handles, resolved fresh (by design)
│   ├── cache/
│   │   ├── cache.go                 # Cache facade: CRUD, pub/sub, ACL
│   │   └── acl.go                   # ACL/domain-blocking lookups (Web-only feature)
│   ├── dnsmsg/                      # DNS wire format — imports nothing internal
│   │   ├── dnsmsg.go                # Record types, shared constants
│   │   ├── parse.go                 # Bounded, compression-pointer-aware parsing
│   │   ├── build.go                 # Answer construction (always 4-octet IPv4)
│   │   └── ttl.go                   # TTL rewriting across answer/authority/additional
│   ├── dnsio/
│   │   ├── handler.go               # Handler interface: UDP and TCP/TLS both implement it
│   │   ├── udp.go                   # Datagram send
│   │   └── tcp.go                   # Stream send, 2-byte length prefix (also DoT)
│   ├── netutil/
│   │   ├── localip.go               # LAN address discovery
│   │   ├── socket.go                # SO_REUSEPORT listeners, buffer tuning
│   │   └── ipscan.go                # Detects LAN IP changes, rebinds UDP listeners
│   ├── server/
│   │   ├── udp.go                   # UDP listeners (port 53), one per ~75% of CPUs
│   │   ├── tcp.go                   # TCP listener (port 53) + RFC 1035 framing loop
│   │   ├── dot.go                   # TLS listener (port 853, RFC 7858)
│   │   └── cert.go                  # Self-signed cert generation via crypto/x509
│   ├── rules/
│   │   ├── rules.go                 # StartRules — wiring, singleflight, cache:invalidate
│   │   ├── pipeline.go              # The query path, layer by layer
│   │   ├── servicestatus.go         # Service on/off gate, 5s in-memory memo
│   │   ├── blocklist.go             # ACL check, in-memory verdict cache
│   │   └── analytics.go             # Per-query telemetry (fire-and-forget)
│   ├── dbpool/dbpool.go             # DNS record + CNAME chain resolution
│   └── forwarder/
│       ├── forwarder.go             # Upstream DNS forwarding
│       ├── pool.go                  # Multiplexed socket pool, generated TXIDs
│       └── breaker.go               # Per-upstream circuit breakers
└── shared/                          # Infrastructure layer, Go port of shared/source/
    ├── keys/                        # CacheKeys, QueueKeys, ACLKeys, status labels
    ├── logger/                      # Structured JSON logging (log/slog)
    ├── mongo/ redis/ rabbitmq/      # Connection managers, cache store, pub/sub, publisher

server/source/
├── cluster/Cluster.ts               # Own cluster.fork() bootstrap (same SCHED_RR pattern)
├── core/{fastify.ts,key.ts}         # Fastify app (port 4773), config/RBAC seed data
├── Database/MongoCollectionManager.ts  # RBAC seed/index logic, caches collection handles
├── Redis/RedisAdminInspector.ts     # Admin/debug cache inspection (server-only feature)
├── (MongoConnectionManager, RedisConnectionManager, RedisCacheStore, RedisPubSub,
│    CacheKeys/QueueKeys/DNS_QUERY_STATUS_KEYS, RabbitMQService + collaborators —
│    shared with Web/ via the `shared/` package, not duplicated. See below.)
├── Router/ · Controller/ · Services/  # Domains, DNS records, Users, Roles,
│                                       # ACL policies, DomainGroups, IPGroups,
│                                       # Analytics, Dashboard, Logs, Settings,
│                                       # DHCP devices, Auth, Public (info/health)
│                                       # (Router/AntiPornMode/ and Router/AntiAdsMode/
│                                       #  are empty leftover dirs — the "modes" are
│                                       #  seeded domain groups, not separate APIs)
├── constants/ · utilities/           # Domain lists + Initialize*Group seeders
├── container/                        # DIContainer + appContainer (string keys)
├── Middlewares/                      # authGuard, PermissionGuard, SessionStore, TokenExtractor
└── CronJob/Jobs/
    ├── LoadPolicies.cron.ts          # Policies → Redis ACL sets, every 60s
    ├── Connected_IP_fetcher.cron.ts  # LAN device sweep, every 2 min
    ├── DashboardAnalytics.cron.ts    # 24h stats rollup, every 5 min
    ├── BatchAnalytics.cron.ts        # Consumes DNS_Analytics → analytics collection
    ├── LogsExportWorker.cron.ts      # Consumes LOGS_EXPORT queue
    └── CleanupExports.cron.ts        # Deletes exports older than 24h

shared/source/                        # `nexoraldns-shared` — file: dependency of server/ and DHCP/
                                      # (Web/ carries its own Go port under Web/shared/)
├── RabbitMQ/                        # RabbitMQConnectionManager, QueueManager, Publisher, Consumer, Rabbitmq.config
├── Redis/                           # RedisConnectionManager, RedisCacheStore, RedisPubSub, CacheKeys.cache
├── Database/MongoConnectionManager.ts  # CPU-scaled maxPoolSize, connectionLogged guard
└── utilities/logger.ts
```

`shared/` holds only what was byte-identical or safely mergeable between `Web/` and `server/` — the connection layer. `Redis.cache.ts`/`RedisAdminInspector.ts`/`MongoCollectionManager.ts` and the Go `cache/acl.go` stay per-module: they wrap the shared connection classes but expose module-specific features (server does RBAC/index/seed bootstrap; Web does ACL-blocking lookups in the DNS hot path) and are *not* duplication to collapse further.

---

## Core Service Responsibilities

| Service | File | Responsibility |
|---|---|---|
| `StartRules` | `Web/internal/rules/rules.go` | The single query-processing entrypoint shared by all three transports. Owns the 4-check pipeline, single-flight dedup (`singleflight.Group` — one instance is wired in `app.New()` and shared by UDP/TCP/DoT, so dedup **does** cross transports), and the `cache:invalidate` Redis subscription (registered once from `app.Start()`) |
| `ServiceStatusChecker` | `Web/internal/rules/servicestatus.go` | Redis-cached service on/off switch with a 5s in-memory memo, MongoDB `service` collection fallback. Unreachable MongoDB ⇒ `databaseOffline`, policy enforcement bypassed rather than the query failing |
| `BlockList` | `Web/internal/rules/blocklist.go` | ACL check over the Redis ACL sets, fronted by an in-memory verdict map (5s TTL, swept at 10k entries). Boundary-aware wildcard matching. **Fails open** on error. Also exposes `CheckDomainsBatch` for bulk lookups and `ACLStats` for introspection |
| `dbpool.Service` | `Web/internal/dbpool/dbpool.go` | Resolves a domain to its record, walking CNAME chains up to 10 hops via sequential MongoDB `findOne` calls (each hop depends on the previous — cannot be parallelized), with circular-reference detection and a shared 3s per-hop memo |
| `forwarder.Service` | `Web/internal/forwarder/forwarder.go` | Forwards a query to a shuffled 6-IP pool (Cloudflare/Google/Quad9 unfiltered) over a **64-socket multiplexing pool**, 2s per-upstream timeout with fallthrough. Per-upstream circuit breakers. Publishes analytics in a fire-and-forget goroutine |
| `cache.Service` | `Web/internal/cache/cache.go` + `acl.go` | Redis client: generic CRUD, pub/sub for cache invalidation, and the ACL-specific reads (`isDomainBlocked`, `getBlockedDomainsForIP`) |
| RabbitMQ connection layer | `shared/source/RabbitMQ/` (TS, single copy) and `Web/shared/rabbitmq/` (its Go port) | AMQP client. Queue declarations are memoized per-process (`assertedQueues: Set<string>`) — asserted once, not on every publish/consume call |
| `dnsio.Handler` implementations | `dnsio/udp.go` (UDP), `dnsio/tcp.go` (TCP/TLS) | Both use the parsing helpers from `dnsmsg/`; the stream variant only differs in the 2-byte length-prefixed framing (RFC 1035 §4.2.2) |

> The `.../Start/ServiceStatusChecker.service.ts`, `.../Rules/BlockList.service.ts`, `.../DB/DB_Pool.service.ts` and `.../Forwarder/GlobalDNSforwarder.service.ts` paths that appeared in earlier revisions of this table were the **pre-Go-rewrite TypeScript implementations**. They no longer exist; the engine is Go throughout.

---

## Cluster & Concurrency Model

- `server/` runs `cluster.fork()` with `Math.max(1, Math.floor(os.cpus().length * 0.75))` workers and `cluster.schedulingPolicy = cluster.SCHED_RR`. `Web/` reaches the same parallelism inside a single Go process: it opens that same number of UDP listeners on port 53 with `SO_REUSEPORT` so the kernel spreads datagrams across them, drains each on its own goroutine, and handles every query on a goroutine of its own.
- **MongoDB connection pooling is CPU-scaled**, not left at the driver default. `shared/source/Database/MongoConnectionManager.ts` computes `maxPoolSize` per worker as `clamp(200 / totalUsableCpus, 20, 50)`, where `totalUsableCpus` is itself scaled by 0.75 — a floor of 20 (so a single busy worker always has headroom) and a ceiling of 50 (since DNS/API lookups are single fast document reads, not bulk operations), targeting roughly 200 aggregate connections across the whole cluster rather than `workers × 100` (the driver default) with no coordination. An additional `ABSOLUTE_MAX_AGGREGATE = 300` term caps the total once the worker count grows far enough that the per-worker floor would otherwise dominate.
- **The inbound query socket's UDP buffer is explicitly enlarged** (4MB requested via `SetReadBuffer`/`SetWriteBuffer` in `Web/internal/netutil/socket.go`), applied only after the socket is confirmed bound — calling these setters on an unbound socket throws. The kernel's actual granted size is read back and logged (Linux reports 2× the requested value, which is documented bookkeeping, not a discrepancy). The OS caps the request at `net.core.rmem_max`/`wmem_max` regardless of what's asked; on a stock Linux host with default sysctls (`rmem_max` = `rmem_default` = 212992 bytes), the code-level request is silently clamped back to the default unless that ceiling is separately raised.
- The Docker deployment raises that ceiling automatically: `Scripts/docker-entrypoint.sh` writes to `/proc/sys/net/core/rmem_max`/`wmem_max` at container start (works because the `nexoraldns` service runs `privileged: true` + `network_mode: host` in `docker-compose.yml`/`dev.compose.yaml`, so there's no isolated network namespace — the write lands on the real host value). **The bare-metal `Scripts/install.sh` path does not yet do this** — see Known Gaps.
- **Outbound upstream forwarding uses a 64-socket multiplexing pool, not one shared socket and not a dedicated socket per query.** This was arrived at empirically. A single shared forwarder socket caused a real production issue — frequent "no response from any DNS server" failures across unrelated domains — because many concurrent queries shared it: a direct test sending 20 queries through one shared socket at once dropped 19 of them. Giving each query its own socket fixed that (20/20, repeatably), and since buffer size was not the bottleneck (the same loss occurred even with `rmem_max` already raised to 4MB) the fix was architectural rather than a tuning knob. But a dedicated socket per query does not scale — unbounded file-descriptor growth under load — so the shipped design is `socketPoolSize = 64` sockets, each multiplexing the full `0x10000` TXID space via a generated (not client-reused) transaction ID, with the client's original TXID restored before replying. The rejected alternative and the reasoning are documented in the code comments in `forwarder/pool.go`. Because the model multiplexes rather than queues, `QueueDepth()` is always `0` and there is no blocking semaphore.
- **Single-flight deduplication** prevents duplicate concurrent MongoDB lookups for the same domain. One `StartRules` instance is shared by all three transports and survives an IP rebind, so a cold domain queried simultaneously over UDP, TCP and DoT collapses into a single database read.
- **RabbitMQ queue declarations are memoized** per process via an `assertedQueues: Set<string>` guard in a shared `ensureQueue()` helper — every `publish`/`consume`/`publishBatch`/`consumeBatch`/`getQueueMessageCount` call site routes through it, so a queue is declared once per process lifetime rather than on every message (a queue is a durable, broker-side object that survives channel/connection drops, so re-declaring it per-message was pure overhead).

---

## Database Schema

Both `Web/` and `server/` connect to the same MongoDB database (`nexoral_db` by default) but register different subsets of collections, matching what each service actually reads/writes.

**`Web/`'s DNS engine reads/writes**: `service`, `dns_records`, `domains`, `analytics` (via `Web/internal/config/keys.go`).

**`server/`'s API additionally manages**: `users`, `roles`, `permissions`, `access_control_policies`, `domain_groups`, `ip_groups`, `session_manage` (via `server/source/core/key.ts`).

**Declared but unused**: `logs` and `rules` appear in both key files, in `AllCollections`, and in the index bootstrap, but no code path reads or writes them and neither has a schema. See Known Gaps.

### `dns_records`
```typescript
{
  _id: ObjectId,
  name: string,               // domain name, exact-match lookup key
  type: "A" | "CNAME" | ...,  // CNAME triggers chain resolution in dbpool/dbpool.go  
  value: string,               // IP for A records, target domain for CNAME
  ttl: number,
  domainId: ObjectId
}
// Index: { domainId: 1 }
```

### `service`
```typescript
{
  SERVICE_NAME: string,        // unique, matched against DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME
  Service_Status: "active" | "inactive",
  DefaultTTL: number,
  apiKey: string,              // encrypted
  Connected_At / Disconnected_At / Last_Synced_At / Next_Expected_Sync_At: Date | null,
  Total_Connected_Devices_To_Router: number,
  List_of_Connected_Devices_Info: any[]
}
// Index: { Service_Status: 1 } (unique)
```

### `access_control_policies` (backs the ACL / block-list system, including Anti-Porn/Anti-Ads modes)
```typescript
{
  _id: ObjectId,
  policyType: "domain_user",
  targetType: "all" | "single_ip" | "multiple_ips" | "ip_group" | "multiple_ip_groups",
  targetIP?: string, targetIPs?: string[],
  targetIPGroup?: ObjectId, targetIPGroups?: ObjectId[],
  blockType: "domain_group" | ...,
  domainGroup?: ObjectId,      // ref -> domain_groups
  domainGroups?: ObjectId[],   // when blockType is multiple_domain_groups
  domains?: string[],          // when blockType is specific_domains
  policyName: string,
  isActive: boolean,
  createdAt: number, updatedAt: number
}
// Indexes: { policyName: 1 }, { isActive: 1 }, { policyType: 1 }, { targetType: 1 }, { createdAt: -1 }
```

### `domain_groups`
```typescript
{
  _id: ObjectId,
  name: string,               // unique indexed
  description?: string,
  domains: string[],          // wildcard-capable; plain strings or {domain, isWildcard}
  isSystemGroup: boolean,     // true for the three pre-seeded groups
  category?: string
}
// Indexes: { name: 1 } (unique), { createdAt: -1 }
```

### `analytics`
```typescript
{
  queryName: string, queryType: string, SourceIP: string,
  Status: string,    // DNS_QUERY_STATUS_KEYS: RESOLVED | BLOCKED | SERVICE_DOWN | FAILED | FORWARDED | ...
  From: string,      // FROM_CACHE | FROM_DB | Upstream provider name | FROM_BLOCKED | FROM_FAIL_SAFE
  timestamp: number, duration: number,
  createdAt: Date, updatedAt: Date   // stamped by the batch consumer
}
// Published to RabbitMQ (DNS_analytics queue) from Web/, batch-consumed and
// written here by server/source/CronJob/Jobs/BatchAnalytics.cron.ts.
// Indexes: { timestamp: 1 }, { Status: 1 }, { queryType: 1 }, { From: 1 }, { duration: 1 },
//          { createdAt: 1 } with expireAfterSeconds: 604800 (7-day auto-cleanup),
//          { timestamp: 1, Status: 1 }, { timestamp: 1, queryType: 1 }, { timestamp: -1 }
```

### `users` / `roles` / `permissions` / `session_manage`
See [RBAC & User Management](#rbac--user-management) below — unchanged from the existing RBAC implementation.

---

## Redis Caching Strategy

The key scheme is defined **once per language** and mirrored exactly: `Web/shared/keys/keys.go` for the engine, `shared/source/Redis/CacheKeys.cache.ts` for the TS services. They are a deliberate port, not a duplication to collapse — see [Directory Structure](#directory-structure).

```typescript
enum CacheKeys {
  Service_Status = "dns-server-status",     // 60s TTL, plus a 5s in-process memo
  Domain_DNS_Record = "Domain_DNS_Record",  // used as `${Domain_DNS_Record}:${queryName}`
  Block_Domains = "Blocked_Domain"
}

enum QueueKeys {
  DNS_Analytics = "DNS_analytcs"            // [sic] — RabbitMQ queue name, not a Redis key
  LOGS_EXPORT   = "logs_export"
}
```

### ACL / block-list keys

Populated by `server/source/CronJob/Jobs/LoadPolicies.cron.ts`, **not** by the DNS engine. Six keys, split exact from wildcard so the hot path can use O(1) `SISMEMBER`:

| Key | Type | Contents |
|---|---|---|
| `acl:ip:<ip>:exact` | Set | exact blocked domains for one client |
| `acl:ip:<ip>:wild` | Set | wildcard patterns for one client |
| `acl:all_users:exact` | Set | exact blocks applying network-wide |
| `acl:all_users:wild` | Set | wildcard blocks applying network-wide |
| `acl:metadata` | String | policy/group counts and last-load time |

All with a 1-day TTL, written in a **single atomic `MULTI`** after the old `acl:*` keys are `SCAN`ned and dropped, so the engine never reads a half-replaced rule set. Entries may be plain domain strings or JSON `{domain, isWildcard}` objects; the loader accepts both shapes for backwards compatibility.

**Lookup strategy** (`Web/internal/cache/acl.go`): the two `:exact` sets are checked first with `SISMEMBER`. Only on a miss does the code scan the `:wild` sets — small, but not indexable. Wildcard matching is boundary-aware:

| Pattern | Matches | Does not match |
|---|---|---|
| `*.example.com` | `example.com`, `a.example.com`, `a.b.example.com` | `notexample.com` |
| `google.*` | `google.com`, `google.co.uk` | `googlexyz.com` |
| `example.com` | `example.com` and its subdomains | — |
| `*` | everything | — |

**Propagation is immediate, not polled.** Every policy create/update/toggle/delete and every domain-group mutation calls `forceReloadACLPolicies()` synchronously; the 60s cron only catches drift. The 3–5s figure quoted in earlier revisions of this document described the cron-only path and no longer applies to API-driven changes.

### Other caches

| Cache | TTL | Location |
|---|---|---|
| Record cache | the record's own `ttl` | `Web/internal/cache/cache.go` |
| Service status | 60s Redis + 5s in-process memo | `rules/servicestatus.go` |
| Block verdicts | 5s in-memory, swept at 10k entries | `rules/blocklist.go` |
| CNAME hops | 3s in-memory, swept at 10k entries | `dbpool/dbpool.go` |
| Dashboard stats | 30 min, recomputed every 5 min | `CronJob/Jobs/DashboardAnalytics.cron.ts` |
| Sessions | 30 min, explicitly evicted | `Middlewares/SessionStore.ts` |
| Log-export metadata | 24h | `Services/Logs/LogsExport.service.ts` |

**Record cache**: `${Domain_DNS_Record}:${queryName}` → the resolved record JSON. Set both on a fresh MongoDB resolution and on a successful upstream forward.

**Cache invalidation**: pub/sub on the `cache:invalidate` channel (not a polling/expiry-only model) — on receipt, `BlockList.ClearCaches()` clears the in-process verdict cache, the 5s service-status memo is dropped, and the `Service_Status` Redis key is deleted, forcing the next query to re-read from MongoDB. The subscription is registered once from `app.Start()`.

---

## RBAC & User Management

This is the admin-facing management layer on top of the existing RBAC primitives (`users`, `roles`, `permissions` collections — see `server/source/core/key.ts` and `server/source/Database/MongoCollectionManager.ts` for the seeded permission catalog and default roles). It is administrative surface, not part of the DNS query path.

### Users Collection (current shape)

```typescript
{
  _id: ObjectId,
  username: string,            // unique indexed, login identifier
  password: string,            // bcrypt hash
  roleId: ObjectId,            // ref -> roles._id
  passwordUpdatedAt: Date | null, // null forces a password change on next login
  isActive: boolean,           // false blocks login (checked in Login.service.ts)
  createdBy: ObjectId,         // admin user who created this account
  createdAt: number            // Date.now() epoch ms
}
```

### Admin-created users: temporary password flow

There is no email/invite flow. An admin with "Manage Users" (permission code 5) or "Full Access" (code 4) creates a user directly with a username and a temporary password (`POST /api/users`). The new user document is inserted with `passwordUpdatedAt: null` — the same field the bootstrap admin account uses. The dashboard already gates on this field (`client/app/dashboard/page.js`): on login, if `passwordUpdatedAt` is `null`/`undefined`, a required "Change Password" modal (`client/components/auth/ChangePasswordModal.js`) blocks the dashboard until the user sets their own password. No separate "invited"/"pending" status or email delivery is needed — the temporary password itself is the credential the admin hands to the new user out-of-band.

Resetting a user's password (`PATCH /api/users/:userId/reset-password`) re-arms this gate the same way and immediately invalidates that user's session (Redis + `session_manage`), forcing a fresh login with the new temporary password.

### Roles: custom permission sets

Admins with "Manage Roles" (permission code 6) or "Full Access" (code 4) can create roles by selecting any subset of the fixed permission catalog (`GET /api/roles/permissions`) rather than being limited to the seeded defaults (Super Admin, Admin, Moderator, User, Guest). A role cannot be deleted while any user is still assigned to it.

### API Surface

| Method | Route | Purpose | Required permission |
|--------|-------|---------|---------------------|
| POST | `/api/users` | Create a user with a temporary password | 4 or 5 |
| GET | `/api/users` | List users (role populated, paginated) | 4 or 5 |
| GET | `/api/users/:userId` | Get a single user | 4 or 5 |
| PUT | `/api/users/:userId` | Update username/role/active status | 4 or 5 |
| PATCH | `/api/users/:userId/reset-password` | Admin-issued password reset | 4 or 5 |
| DELETE | `/api/users/:userId` | Delete a user | 4 or 5 |
| GET | `/api/roles/permissions` | List the permission catalog | 4 or 6 |
| POST | `/api/roles` | Create a role | 4 or 6 |
| GET | `/api/roles` | List roles (permissions populated) | 4 or 6 |
| GET | `/api/roles/:roleId` | Get a single role | 4 or 6 |
| PUT | `/api/roles/:roleId` | Update a role's name/permissions | 4 or 6 |
| DELETE | `/api/roles/:roleId` | Delete a role (blocked if still assigned to users) | 4 or 6 |

Implementation: `server/source/Router/Users/`, `Controller/Users/`, `Services/Users/Users.service.ts`; `server/source/Router/Roles/`, `Controller/Roles/`, `Services/Roles/Roles.service.ts`. Frontend: `client/app/dashboard/users/page.js` (Users/Roles tabs), `client/components/users/*`.

### Self-lockout guards

An admin cannot deactivate, demote, or delete their own account through this API — every mutating endpoint compares the target `userId` against the requesting admin's own id (`request.user._id`) before allowing role/active-status changes or deletion.

---

## 🛡️ Pre-Seeded Blocking Groups

### Overview

NexoralDNS ships three ready-made domain lists — Anti-Porn, Anti-Ads and Anti-AI — so an admin can enable content filtering without assembling a domain list by hand.

**They are not a separate feature with their own API, service, controller or UI.** Each one is a `domain_groups` document with `isSystemGroup: true`, seeded at boot and then managed through the **same generic access-control API** as any user-created group. Enabling one means creating an `access_control_policies` document that targets an IP, IP group or `all` with `blockType: 'domain_group'` pointing at that group.

> **Documentation correction.** Earlier revisions of this document described dedicated `/api/anti-porn-mode/*` and `/api/anti-ads-mode/*` routes, `Services/AntiPornMode/*`, `Controller/AntiPornMode/*`, and `client/components/anti-porn-mode/*`. **None of those exist in the current codebase.** `server/source/Router/AntiPornMode/` and `Router/AntiAdsMode/` are empty leftover directories with no files. Any reference to them is stale.

### The three groups

| Group name (`domain_groups.name`) | Domains | Source | Seeded by |
|---|---|---|---|
| `Adult Content (Anti-Porn)` | 92 | Major adult sites and variants | `server/source/utilities/InitializeAdultContentGroup.utls.ts` |
| `Ads & Trackers (Anti-Ads)` | 155 | Advertising, analytics, tracking and ad-CDN domains | `InitializeAdBlockingGroup.utls.ts` |
| `AI Chat & Generative Tools (Anti-AI)` | 42 | AI assistants, model APIs, AI coding tools | `InitializeAIContentGroup.utls.ts` |

All three are invoked sequentially during startup in `server/source/core/fastify.ts`, before the HTTP listener binds.

### Key Features

1. **Pre-configured domain lists** — plain domain strings and wildcard patterns, held in `server/source/Constants/{AdultContentDomains,AdBlockingDomains,AIContentDomains}.constant.ts`
2. **Flexible targeting** — any of the five policy target types: `single_ip`, `multiple_ips`, `ip_group`, `multiple_ip_groups`, `all`
3. **Easy management** — create, toggle, edit or delete the policy from the Access Control page's Policies tab
4. **Real-time propagation** — policy mutations call `forceReloadACLPolicies()` synchronously, then publish on `cache:invalidate`; the 60s cron is only the backstop, so an API-driven change lands immediately rather than after a tick
5. **No separate enforcement path** — the engine runs the identical ACL check it runs for any other block rule; there is no special-cased fast path

### How It Works

1. On startup, each seeder upserts its group on `{ name, isSystemGroup: true }`, comparing the domain count to decide create vs. update
2. An admin creates a policy targeting the desired clients with `blockType: 'domain_group'` and the group's `_id`
3. `LoadPolicies.cron.ts` expands all active policies into Redis ACL sets — `acl:ip:<ip>:exact`/`:wild`, `acl:all_users:exact`/`:wild` — resolving group references in parallel and replacing the old keys atomically in a single `MULTI`
4. On each DNS query, `internal/rules/blocklist.go` evaluates the two exact sets first (`SISMEMBER`, O(1)), falling back to scanning the small wildcard sets only on a miss
5. A match produces a `0.0.0.0` answer

### Maintenance

- **Add domains**: edit the relevant `Constants/*.constant.ts`, update the `lastUpdated` metadata, restart to re-seed
- **Check status**: `mongo nexoral_db --eval "db.domain_groups.findOne({ isSystemGroup: true, name: 'Adult Content (Anti-Porn)' })"`
- **Debug**: `redis-cli keys "acl:*"`, then inspect the expanded sets

### Security notes

Input validation, safe `ObjectId` conversion (NoSQL injection prevention), policy-name sanitization, array size limits on policy creation, sanitized error responses, and JWT-gated endpoints — all inherited from the generic access-control layer rather than reimplemented.

---

## Performance Targets

The per-path latency table below lists **design targets**, not per-path measurements — there is no automated per-layer benchmark in this repo. Aggregate throughput and average latency *have* been measured with `dnsperf` (see the load test results further down); the individual path budgets remain engineering goals.

| Path | Target Latency | What actually happens |
|-------|---------------|-------|
| Redis cache hit (record + service status) | **<2ms** | 2 sequential Redis round trips (service status, then record) — intentionally sequential, not parallelized, because either check can short-circuit the query before the more expensive path runs |
| MongoDB lookup (cache miss) | **<5ms** | Single-flight-deduped `findOne`, sequential per CNAME hop (1 hop = 1 round trip; a 10-hop chain is ~10x a direct hit) |
| Upstream forward | **<50ms** | 2s timeout per upstream server, automatic fallthrough across a shuffled 6-IP/3-provider pool (worst case 12s if all 6 fail), over a 64-socket multiplexing pool with generated TXIDs |

### Measured results

Test bed — everything co-located on one machine, including the load generator:

| | |
|---|---|
| CPU | AMD Ryzen 5 5500U — 6 cores / 12 threads, boost 4.05 GHz, x86_64 |
| RAM | 7.1 GiB total |
| OS | Linux 6.8 (kernel), Docker `host` network mode, no CPU/memory limit on the container |
| Transport | UDP:53 over loopback (`10.35.70.15` bound to `lo`) — no NIC in the path |
| Co-located | MongoDB, Redis, RabbitMQ **and `dnsperf` itself** |
| Workload | `Test/dnsperf.txt` — 49 domains, warm cache |

| Load shape | QPS | Avg latency | Lost |
|---|---|---|---|
| 5 clients, 50 in flight | **12,746** | 3.8 ms | 0 |
| 8 threads, 2000 in flight | 10,396 | 189 ms | 95 (0.03%) |

Because the load generator competes for the same 12 threads, **12,746 is a floor, not the engine's ceiling** — a run driven from a separate host would measure higher.

The gentler run is both faster and far lower latency: at 2000 in flight the load generator competes with the server for the same cores, and the deep queue adds wait time that Little's Law predicts almost exactly (2000 ÷ 10,396 ≈ 192 ms). Saturation numbers measure the queue, not the server.

Scaling beyond this is bounded by hardware and by domain concentration, with MongoDB (not the DNS engine or Redis) becoming the bottleneck under sustained cache-miss-heavy load. Domain concentration (how many clients share the same popular domains vs. each hitting unique long-tail ones) matters more than raw device count, since the Redis record cache benefits *all* clients querying a given domain within its TTL window, not just the client that populated it.

---

## Operational Resilience

- **Fail-safe on DB outage**: `internal/rules/rules.go` catches MongoDB errors at the service-status and ACL-check stages and sets `databaseOffline = true`, bypassing policy enforcement rather than returning SERVFAIL — the query still resolves via cache or upstream forward.
- **Fail-open on ACL errors**: `BlockList.checkDomain` and `RedisCache.isDomainBlocked` both return `false` (allow) on internal errors rather than blocking all traffic.
- **Multi-provider upstream forwarding**: 3 providers, 6 IPs (Cloudflare, Google, Quad9 unfiltered), shuffled per query, 2s per-server timeout with automatic fallthrough to the next provider on timeout or send failure. Each upstream has its own circuit breaker, and queries are spread over a 64-socket multiplexing pool with **generated** transaction IDs, so one slow or failing upstream cannot affect another query's attempt and two concurrent clients cannot have their responses confused.
- **Automatic LAN IP rebinding**: `internal/netutil/ipscan.go` polls the local IP every 10s and rebinds the UDP listeners if it changes (e.g., DHCP lease renewal on the host itself); a failed rebind is retried on the next tick. TCP:53 and DoT:853 bind once at startup and do **not** follow an address change.
- **Self-signed DoT certificates**: auto-generated in Go via `crypto/x509` (RSA-2048, 730-day validity) on first startup if absent, then persisted atomically — temp file + `Sync` + `Rename` — to `/etc/nexoral/cert` (configurable via `DOT_CERT_DIR`) so the same cert survives restarts. The key is written `0600`. No external `openssl` call.

---

## Known Gaps & Non-Goals

Honest list, current as of this document's last update — not aspirational:

1. ~~**No automated test suite.**~~ **Resolved** — see [Testing](#testing). `Test/` now runs four suites (50 Vitest specs across `server`/`tools`/`dhcp`, plus 13 Go test files under `Web/`), all infrastructure is faked so nothing needs a live backing service, and CI gates the container push on them.
2. **No real-time metrics/observability.** Analytics land in MongoDB via a RabbitMQ batch consumer — queryable after the fact, but no live p50/p95/p99 dashboard and no metrics exporter. The forwarder *does* compute a useful `Status()` struct (`activeForwards`, `successRate`, per-breaker state), but no endpoint exposes it. The sub-5ms targets above therefore cannot be verified in production without manual querying.
3. ~~Duplicated infrastructure code between `Web/` and `server/`.~~ **Resolved** — the RabbitMQ, Redis, and MongoDB connection layers now live once in `shared/source/` (the `nexoraldns-shared` package, a `file:` dependency of both). This had already caused one real bug — an `assertQueue` argument mismatch between `Web`'s publisher and `server`'s consumer paths — that existed in both copies and had to be found and fixed in both independently; that class of bug is now structurally impossible for these three layers. `Redis.cache.ts`/`RedisAdminInspector.ts`/`MongoCollectionManager.ts` and the Go `cache/acl.go` remain per-module by design (see Directory Structure) since they wrap the shared connection classes with module-specific behavior, not duplicate them.
4. **Bare-metal deployment doesn't get the UDP buffer fix.** `Scripts/docker-entrypoint.sh` raises `net.core.rmem_max`/`wmem_max` for the Docker path; `Scripts/install.sh` (the bare-metal LAN install path) does not yet do the equivalent.
5. **No domain rerouting/rewriting** and **no per-user plan gating** in the DNS query path — see the note in [System Overview](#system-overview).
6. **MongoDB connection pool sizing assumes co-location isn't extreme.** The CPU-scaled `maxPoolSize` targets ~200 aggregate connections for `Web/`'s cluster and another ~200 for `server/`'s cluster independently — the two don't coordinate with each other, so total real connection load against one MongoDB instance is the sum of both, not a jointly-tuned number.
7. **`tools/` (MCP server) holds no sessions of its own.** Clients authenticate via OAuth and keep their own tokens, which `server/` validates, so restarting `tools/` does not sign anyone out. What is still process-local is the in-flight OAuth state (parked authorization requests, unredeemed codes, the 30s token-verification cache), so it cannot yet be horizontally scaled behind a load balancer without moving that to Redis (deferred — see [MCP Tool Server](#mcp-tool-server-tools)).
8. **No admission control on the DNS query path.** `internal/server/udp.go` spawns a goroutine per datagram with no per-IP rate limit or concurrency cap, so under saturation the server is bounded by memory rather than by a limiter. The forwarder *does* bound itself (64 sockets × the full TXID space), and `concurrencyLimit()` is exposed on the forwarder's `Status()` but unused.
9. **`logs` and `rules` MongoDB collections are declared but never used** — they appear in `server/source/core/key.ts`, `Web/internal/config/keys.go`, `AllCollections` and the index bootstrap, but no code path reads or writes them, and neither has a schema.
10. **Dead code, worth deleting rather than reviving.** `components/access-control/AnalyticsTab.js` is not rendered by `access-control/page.js`; `client/config/keys.js` defines five endpoints that don't exist on the server (`DNS_RECORDS`, `ZONES`, `STATISTICS`, `SETTINGS`, `LIST_OF_DEVICES`) along with three unused service functions; `server/source/Router/AntiPornMode/` and `Router/AntiAdsMode/` are empty leftover directories; `PUT /dns/delete` is the only destructive route using `PUT` instead of `DELETE`.
11. **Two live bugs in the device broker.** `DHCP/src/service/UpdateResolveConfigFile.service.ts` rewrites `search` lines to `search <IP>` — an IP where a domain list belongs, reading like a copy-paste from the `nameserver` branch above it (it also swallows all errors). `LookupIP` in `Services/DHCP/Router_connection.service.ts` filters out every device ending in `.1` and then decrements the count by exactly `1` regardless of how many were filtered; it should be `originalLength - filtered.length`.
12. **CORS is permissive by configuration.** `CORS_CONFIG.ORIGIN: "*"` is combined with `ALLOW_CREDENTIALS: true` and `trustProxy: true` on a LAN-exposed API. Acceptable given the LAN-only deployment model, but it is a deliberate exception rather than an oversight.

---

## Testing

**Four suites, all runnable offline.** No test requires a live MongoDB, Redis or RabbitMQ — the infrastructure is faked.

```bash
cd Test
npm test                # all four, in order
npm run test:server     # 28 Vitest specs
npm run test:tools      # 18 Vitest specs
npm run test:dhcp       # 4 Vitest specs
npm run test:web        # cd ../Web && go test -v -count=1 ./...
npm run coverage        # all four with coverage
```

| Suite | Coverage |
|-------|----------|
| `Test/server/` | Middlewares (`TokenExtractor`, `SessionStore`, `authGuard`, `permissionGuard`), database, helpers (`IP_Ping`, `responseBuilder`, `bcrypt`, `jwt`, `buildLogsQuery`, `passwordPolicy`), Redis (`RedisConnectionManager`, `RedisAdminInspector`, `RedisCacheStore`, `RedisPubSub`, `CacheKeys`), the DI container, the logs service, RabbitMQ (publisher, queue manager, consumer, connection manager) |
| `Test/tools/` | All ten `register*Tools` groups, `toolResult`, `ApiClient`, `HealthMonitor`, core keys, `NexoralOAuthProvider` |
| `Test/dhcp/` | `config/key`, `config/DHCP`, `AutoScanIPchange.service`, `UpdateResolveConfigFile.service` |
| `Web/**/*_test.go` | 13 files: ACL wildcard matching, cache CRUD/TTL/pubsub, CNAME resolution including **circular CNAME** and hop caching, forwarder pool and circuit breakers, DNS wire format, sockets and local IP, pipeline layers (`DefaultTTL` across numeric shapes, `servableLocally`, service status memo and offline fallback, blocklist verdict TTL, analytics status mapping), config keys |

Fakes live in `Test/server/_testUtils/` (`fakeMongo`, `fakeRedis`, `fakeAmqp`, `fakeReply`, `fakeRequest`, `mockContainer`) and `Test/tools/_testUtils/` (`fakeHttp`, `fakeMcpServer`). `fakeReply`/`fakeRequest` stand in for Fastify's objects so services are called with the same argument shape production uses.

### CI

`.github/workflows/push_to_github_registry.yml` runs four jobs:

1. `detect-changes` — diffs against the `before` SHA to decide which suites are relevant
2. `test-environment` — Node 20, `npm ci` in `Test/`, runs the selected suites **with coverage**
3. `verify-web` — `go build`, `go vet`, a **`gofmt -l` gate that fails on unformatted files**, then `go test -coverprofile`
4. `build-and-push` — **gated on the tests passing** (a failure blocks it); pushes `ghcr.io/nexoral/nexoraldns:latest` with size/digest annotations

A separate release job builds `.deb` and `.tar.gz` artifacts for `amd64`/`arm64`/`i386`, publishes the GitHub Release, and prunes all but the two most recent releases.

### Load testing

Aggregate throughput numbers in this document come from `dnsperf`, not from the unit suites:

```bash
dnsperf -s <lan-ip> -d Test/dnsperf.txt -c 5 -q 50 -l 30
```

Still outstanding: a run on dedicated hardware with the load generator on a separate host, and per-layer rather than aggregate timing.

**Standing rule:** any behaviour change ships with a test update in the same commit.

---

## MCP Tool Server (`tools/`)

A fifth, independent process that lets an LLM (any [Model Context Protocol](https://modelcontextprotocol.io) client) perform domain/DNS operations on a user's behalf. It is a **thin protocol translator, not a new authorization layer**:

- Speaks MCP over the Streamable HTTP transport (`@modelcontextprotocol/sdk`) on an `express` app, bound `0.0.0.0:4774`, `POST/GET/DELETE /mcp` — mirrors `server/`'s `0.0.0.0:4773` LAN-wide binding pattern. `express` is used only because the SDK's OAuth router and bearer middleware are express handlers; there is no other framework in the module.
- Every tool call is translated into a real HTTP request against `server/`'s existing REST API over loopback (`http://127.0.0.1:4773/api/...`). It has no Mongo/Redis/RabbitMQ connection and no DI container of its own — there is no business logic here to inject, so `authGuard`/`PermissionGuard` in `server/` remain the only place authorization decisions are made.
- **Auth flow (OAuth 2.1, browser-based)**: `/mcp` sits behind the SDK's `requireBearerAuth`, so an unauthenticated request gets `401` + `WWW-Authenticate: Bearer resource_metadata=...` — the signal that makes MCP clients show "needs authentication" and start the browser flow. `mcpAuthRouter` mounts `/authorize`, `/token`, `/register`, `/revoke` and both discovery documents (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/mcp`), providing PKCE (S256), Dynamic Client Registration and spec-compliant error codes.
- **`server/` remains the sole authority; `tools/` mints no tokens.** `NexoralOAuthProvider.authorize()` parks the validated request and redirects to `tools/`'s own login page (`/login`, a single self-contained HTML form — deliberately not a route in `client/`, so the flow touches nothing outside `tools/` and the dashboard's own login path is unchanged). That form posts credentials straight to the existing `POST /api/auth/login`; the access/refresh JWTs are read from the response's `Set-Cookie` headers (`response.headers.getSetCookie()` — `server/` never returns tokens in the JSON body) and handed to the client verbatim as the OAuth token pair (`expires_in: 1800`, matching the cookie's `maxAge`). `exchangeRefreshToken` delegates to `POST /api/auth/refresh-token`; `revokeToken` to `POST /api/auth/logout`. Identity, permissions and session lifetime are therefore decided entirely by `server/`.
- **Per-request verification**: `verifyAccessToken` calls `GET /api/auth/verify` (successes cached 30s; failures never cached, so a rejected token immediately produces the `401` that makes the client refresh and retry). The verified token reaches each tool as `extra.authInfo.token` via `requireAuthToken`, and `ApiClient` replays it as a literal `Cookie: access_token=...` header (not `Authorization: Bearer`), because `server/`'s controllers read `request.cookies` directly rather than through the header-fallback `TokenExtractor`. `ApiClient` holds no session state and performs no refresh of its own — refreshing is the MCP client's job through the OAuth grant.
- **Credentials never reach the model**: there are no `login`/`logout` tools and no tool takes a password. The password is typed into the browser page; tokens live in the MCP client, and `tools/` persists only the DCR client registry (`~/.nexoraldns/oauth-clients.json`, `0600`).
- **Authorization-code hygiene**: codes are 32 random bytes, single-use (deleted on redemption attempt, pass or fail), 60s TTL, and bound to the issuing client and `redirect_uri`; parked authorization requests expire after 10 min. Both maps are swept on insert, so neither grows unbounded.
- Raw tokens are never returned to the model — tool results only ever contain the passthrough REST response body.
- **Health gate**: `HealthMonitor.ensureHealthy()` calls `GET /api/health` (cached 3s, `AbortSignal.timeout(3000)`) before every authenticated call — a down MongoDB/Redis/RabbitMQ/API surfaces as a clear "server is not healthy" tool error instead of a raw fetch failure. `check_server_health` and `get_server_info` call `/api/health`/`/api/info` directly and bypass the gate, so they keep working as a diagnostic even when everything else is refusing to run.
- **DNS-rebinding mitigation**: an express middleware ahead of every route checks the `Host` header against a set discovered at startup (`localhost`, `127.0.0.1`, and every non-internal IPv4 address from `os.networkInterfaces()`, each paired with port 4774) before any request reaches the transport — done as explicit application code rather than the SDK's own (deprecated) `allowedHosts` option, per the SDK's current guidance to implement this as external middleware.
- **Directory**: `tools/source/{core,auth,client,tools}` — `auth/NexoralOAuthProvider` (the OAuth server, backed by `server/`), `auth/loginPage` (the sign-in form), `ApiClient` (stateless HTTP + health gate), `tools/register*Tools.ts` (one file per REST route group, mirroring `server/source/Router/*`).
- **Full tool coverage (54 tools)** — one file per route group, same thin-proxy pattern throughout:
  - `registerAuthTools`: `change_password`, `verify_session` (signing in and out is the OAuth flow, not a tool)
  - `registerDomainTools` / `registerDnsTools`: domain and DNS record CRUD
  - `registerUserTools` / `registerRoleTools`: user and role/permission management
  - `registerAccessControlTools`: policies, domain groups, IP groups (largest group — mirrors `AccessControl.route.ts` 1:1)
  - `registerDhcpTools`, `registerSettingsTools`, `registerAnalyticsTools`: DHCP, cache/TTL settings, dashboard analytics + log export
  - `registerPublicTools`: `get_server_info`, `check_server_health` — the only tools that need no account permissions and (for health) skip the gate itself
  - `download_log_export` is the one special case in `ApiClient`: the REST endpoint's success response is a raw text file, not the JSON envelope every other route uses, so it's parsed by content-type rather than through the shared `parseEnvelope` helper, and truncated past 200k characters to avoid flooding the model's context.
- **Known limitations**:
  - OAuth 2.1 permits plain `http` only on loopback, and `mcpAuthRouter` enforces this at startup (`Error: Issuer URL must be HTTPS`) — so the origin baked into the discovery metadata cannot simply be switched to a LAN IP. `ecosystem.config.js` therefore sets `MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL=true` on the `tools` process, which the SDK reads (as a module-level const, so it must come from the environment, not from application code) to relax that check; `MCP_PUBLIC_URL` then defaults to this machine's first non-internal IPv4 (`core/key.ts`), so agents on other LAN devices authenticate with no further configuration. The cost is that the sign-in page and every token cross the LAN unencrypted — setting `MCP_PUBLIC_URL` to an https origin behind a certificate overrides both defaults and is the right choice on an untrusted network. A public HTTPS origin remains out of scope by design (LAN-only, see `AGENTS.md`).
  - Parked authorization requests, issued codes and the token-verification cache live in this process's memory, so restarting `tools/` mid-sign-in means starting the flow again. Already-issued tokens survive, because the MCP client holds them and `server/` validates them.
  - `server/` keeps one session document per user, so signing in from an MCP client invalidates that account's dashboard session and vice versa — a dedicated account for agent access avoids it. Pre-existing behaviour, not introduced by the OAuth flow.

---

## Deployment

LAN-only — see `AGENTS.md`. Two supported paths:

### Docker (`Scripts/docker-compose.yml` / `dev.compose.yaml`)
- `nexoraldns` service: `network_mode: host`, `privileged: true`, `cap_add: [NET_ADMIN]` — required to bind port 53/853 and to tune host-level UDP socket buffers
- `Scripts/docker-entrypoint.sh` raises `net.core.rmem_max`/`wmem_max` to 4MB at container start before launching `pm2-runtime start ecosystem.config.js`
- Mongo/Redis/RabbitMQ run as sibling containers with host-mapped ports for `127.0.0.1` access from the host-networked app container

### Bare-metal (`Scripts/install.sh`)
- Installs Node, PM2, and the four services directly on the host
- Does **not** currently raise the OS-level UDP buffer ceiling (see [Known Gaps](#known-gaps--non-goals))

### Process supervision

`ecosystem.config.js` defines **four** PM2 processes — `server` (Fastify API), `client` (Next.js dashboard), `dhcp` (LAN device broker), `tools` (MCP tool server) — each restarting independently (`restart_delay: 5000`, `max_restarts: 3`) on crash.

The DNS engine (`web`) is **deliberately not** a PM2 process. `ecosystem.config.js` excludes it with an explanatory comment and `Scripts/docker-entrypoint.sh` supervises the compiled Go binary directly with a restart loop before `exec`ing `pm2-runtime` as PID 1 — pm2 supervises the Node services, and a compiled binary only needs a restart loop.

> Earlier revisions of this document listed five PM2 processes including `web`. That was wrong.

---

## Security Considerations

1. **Input validation**: domain names sanitized before DNS packet construction and MongoDB queries; ACL policy inputs validated with array size limits and safe `ObjectId` conversion; `escapeRegex()` applied to every user-supplied log filter, shared by the paginated endpoint and the export worker so they cannot drift
2. **Fail-open, not fail-closed, on internal errors**: a deliberate choice (see [Operational Resilience](#operational-resilience)) — an ACL/DB outage degrades policy enforcement rather than taking down LAN-wide DNS resolution
3. **No public exposure**: this is explicitly a LAN-only system — never expose port 53/853 or the API (4773) to the public internet; ISPs will block DNS behavior that looks like spoofing from a public IP
4. **JWT-based admin authentication** — access token 30 min, refresh 48h, both in httpOnly cookies and never returned in a JSON body. `session_manage` tracks them with a 48h TTL index. The JWT secret is generated 256-bit random and written with flag `wx` and mode `0600` so concurrent cluster workers race safely (losers on `EEXIST` read the winner's value)
5. **Self-lockout guards** on admin user/role mutation endpoints (see RBAC section)
6. **Password policy from a single source**: ≥8 characters with upper, lower and digit, applied identically on user creation, admin reset and self-service change — so the three paths cannot diverge
7. **Admin password reset kills the session immediately** — `passwordUpdatedAt` is re-armed to `null` *and* the target's Redis and `session_manage` entries are dropped
8. **Rate limiting**: global 100 req/min/IP on the API, 10/15min on login, 20/15min on refresh. **There is no rate limiting on the DNS query path** — `internal/server/udp.go` spawns a goroutine per datagram with no admission control, so a query flood is bounded by memory rather than by a limiter. Do not treat the API limits as protection for port 53.
9. **Command-injection safety**: LAN device probing uses `execFile("ping", [...])` with an argument array, never a shell string
10. **MCP credential hygiene**: no login/logout tool, no tool accepting a password, password-shaped tool arguments redacted from logs, raw tokens never returned to the model
11. **CORS is permissive** (`origin: "*"` + `credentials: true` + `trustProxy: true`). Acceptable under the LAN-only model, but a deliberate exception — see Known Gaps

---

## Future Optimizations

Roughly in priority order based on what's actually been found gap-hunting this codebase, not a wishlist:

1. ~~Extract shared Mongo/RabbitMQ connection code~~ **Done** — see `shared/` in Directory Structure and item 3 in [Known Gaps](#known-gaps--non-goals). Also folded Redis's connection/cache-store/pub-sub/cache-keys layer into the same package while at it.
2. ~~**Add a test suite for `Web/`**~~ **Done** — 13 `_test.go` files covering the 4-check pipeline, ACL wildcard matching, CNAME chain resolution including circular-reference detection, the forwarder and its circuit breakers, wire format, sockets, and the analytics path. See [Testing](#testing).
3. ~~**Real load testing** via `dnsperf` to replace estimated capacity numbers with measured ones~~ **Done** — 12,746 QPS at 3.8 ms average, 0 lost; see [Performance Targets](#performance-targets). Still outstanding: a benchmark run on *dedicated* hardware with the load generator on a separate host, and per-layer (rather than aggregate) timing
4. **Real-time metrics** (Prometheus/Grafana or similar) for p50/p95/p99 query latency, cache hit rate, and per-layer timing — currently only available after-the-fact via the `analytics` collection. The forwarder's `Status()` struct already computes most of what an exporter would need, so this is largely a matter of exposing it
5. **Admission control on the query path** — a per-IP rate limit or bounded worker pool on `internal/server/udp.go`. This is a real availability gap, but it must not be implemented as a blocking check in the hot path without measuring first
6. **Bare-metal UDP buffer parity** — add the equivalent of `Scripts/docker-entrypoint.sh`'s sysctl tuning to `Scripts/install.sh`
7. **Delete the dead code** listed in Known Gaps item 10 rather than leaving it to rot
8. **Fix the two device-broker bugs** in Known Gaps item 11
9. DNSSEC support, local AAAA record serving, an IPv6 transport, geo-based routing — longer-term, not currently scoped

---

## Support & Maintenance

### Log Locations (Docker/PM2 — see `ecosystem.config.js`)
- DNS engine (`Web/`): `/var/log/web.log`, `/var/log/web.err.log` — structured JSON via `log/slog`, level from `LOG_LEVEL`
- API (`server/`): `/var/log/server.log`, `/var/log/server.err.log` — pino
- Dashboard (`client/`): `/var/log/client.log`, `/var/log/client.err.log`
- Device broker (`DHCP/`): `/var/log/dhcp.log`, `/var/log/dhcp.err.log`
- MCP server (`tools/`): `/var/log/tools.log`, `/var/log/tools.err.log`

Set `LOG_LEVEL=debug` on the engine to log every incoming query. It is off by default: at production query rates that single line is the most expensive thing on the path. `DEBUG_DNS=1` logs every upstream forward.

### Common Checks

```bash
# Is port 53 actually listening?
sudo netstat -tulpn | grep :53

# PM2 process status / logs (note: `web` is not a PM2 process)
pm2 status
pm2 logs server --lines 100
sudo tail -f /var/log/web.log

# ACL cache contents
redis-cli keys "acl:*"

# Slow MongoDB queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()

# Verify a live server end to end
dig @<lan-ip> example.com               # UDP
dig @<lan-ip> +tcp example.com          # TCP framing
kdig +tls @<lan-ip> -p 853 example.com  # DoT
```

---

## 📄 License

**Proprietary Source-Available License** — see the `LICENSE` file. Not MIT, and not open source. Use, view and report issues are permitted; modification and redistribution are not, and code contributions are not accepted.

---

## 👥 Contributors

- **Ankan Saha** - Initial architecture and implementation

---

**Last Updated:** 2026-10-02
**Version:** 7.24.71-stable
