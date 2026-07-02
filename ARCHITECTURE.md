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
10. [Anti-Porn Mode Feature](#-anti-porn-mode-feature)
11. [Anti-Ads Mode Feature](#️-anti-ads-mode-feature)
12. [Performance Targets](#performance-targets)
13. [Operational Resilience](#operational-resilience)
14. [Known Gaps & Non-Goals](#known-gaps--non-goals)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Security Considerations](#security-considerations)
18. [Future Optimizations](#future-optimizations)
19. [Support & Maintenance](#support--maintenance)

---

## System Overview

NexoralDNS is a LAN-only DNS server and management system with:
- **Sub-5ms query response targets** (cache hit / DB lookup), backed by a Redis-first, MongoDB-fallback resolution pipeline
- **Three DNS transports**: UDP (port 53), TCP (port 53, RFC 7766), and DoT — DNS over TLS (port 853, RFC 7858) — all sharing the same query-processing logic
- **Domain blocking** via an Access Control List (ACL) system: per-IP, per-group, or global policies, including pre-built Anti-Porn and Anti-Ads modes
- **Analytics** for query monitoring, published async via RabbitMQ and batch-written to MongoDB
- **Multi-worker clustering** for multi-core utilization
- **RBAC-based admin dashboard** (users, roles, permissions) for managing the above

> **Not currently implemented**: domain rerouting/rewriting (e.g. redirecting `google.com` → a custom target) and per-user subscription plan gating in the DNS query path. Earlier drafts of this document described both in detail; neither exists in the current codebase (`Web/src`, `server/source`) — there is no rewrite/reroute logic and no plan-check anywhere in the query path. If/when built, this document should be updated alongside the code.

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
      DNS.Service.ts   DNS_TCP.Service.ts  DNS_DoT.Service.ts
      (dgram/UDP)      (net.Server)        (tls.Server)
              │                │                │
              └────────────────┼────────────────┘
                               ▼
              All three transports parse via the same
              IDNSIOHandler interface and dispatch into:
┌─────────────────────────────────────────────────────────────────────┐
│              StartRulesService.execute() — Rules.service.ts          │
│                  (identical logic regardless of transport)           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   [CACHE HIT]           [DB LOOKUP]           [UPSTREAM FORWARD]
   Redis record hit      MongoDB record,       No local record —
                          single-flight-deduped forwarded on a
                                                dedicated per-query
                                                socket to a shuffled
                                                pool (Cloudflare,
                                                Google, Quad9
                                                unfiltered), 2s
                                                per-server timeout,
                                                capped at 256
                                                concurrent forwards
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
           │ Return NXDOMAIN │        │
           └─────────────────┘        │
                                      │
                           ┌──────────▼──────────┐
                           │ CHECK 2: BLOCK LIST │  3-layer cache:
                           │ (ACL)               │  local Map (5s) →
                           └──────────┬──────────┘  global Map (3s) →
                                      │              Redis ACL sets
                           ┌──────────▼──────────┐  (acl:ip:*, acl:all_users)
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

**Fail-safe behavior**: if MongoDB is unreachable at any point in checks 1-3, the pipeline sets a `databaseOffline` flag and bypasses service-status/ACL enforcement rather than hard-failing — queries still resolve (via cache or upstream forward) with reduced policy enforcement, on the reasoning that a LAN losing all DNS resolution is worse than temporarily bypassing blocklists. See `Rules.service.ts`.

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
│   server/ — Fastify API           │   │   Web/ — Core DNS Engine               │
│   (port 4773)                     │   │   (cluster.fork() × floor(cpus×0.75)) │
│                                    │   │                                       │
│  Router → Controller → Service    │   │  DNS.Service.ts (UDP)                 │
│  layers for: DNS records, users,  │   │  DNS_TCP.Service.ts (TCP)             │
│  roles, ACL policies, anti-porn/  │   │  DNS_DoT.Service.ts (TLS/853)         │
│  anti-ads mode, domain/IP groups, │   │       │                               │
│  analytics, health checks         │   │       ▼                               │
│                                    │   │  Rules.service.ts (StartRulesService) │
│  Own cluster.fork() pool, own     │   │  ServiceStatusChecker.service.ts      │
│  MongoClient, own RabbitMQ conn   │   │  BlockList.service.ts                 │
│  (duplicated infra code from      │   │  DB_Pool.service.ts                   │
│  Web/ — see Known Gaps)           │   │  GlobalDNSforwarder.service.ts        │
└─────────────┬──────────────────────┘   │                                       │
              │                          │  Own cluster.fork() pool, own        │
              │                          │  MongoClient, own RabbitMQ conn      │
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
Web/src/
├── cluster/Cluster.ts               # cluster.fork() bootstrap, SCHED_RR
├── Config/
│   ├── DNS.ts                       # Worker entrypoint: starts UDP+TCP+DoT
│   └── key.ts                       # DB_DEFAULT_CONFIGS (collections, defaults)
├── Database/mongodb.db.ts           # Connection pool, CPU-scaled maxPoolSize
├── Redis/
│   ├── Redis.cache.ts               # Singleton RedisCacheService (CRUD, pub/sub, ACL)
│   └── CacheKeys.cache.ts           # CacheKeys / QueueKeys / DNS_QUERY_STATUS_KEYS enums
├── RabbitMQ/Rabbitmq.config.ts      # Singleton RabbitMQService, memoized assertQueue
├── services/
│   ├── DNS/
│   │   ├── DNS.Service.ts           # UDP listener (port 53)
│   │   ├── DNS_TCP.Service.ts       # TCP listener (port 53, RFC 7766)
│   │   └── DNS_DoT.Service.ts       # TLS listener (port 853, RFC 7858, self-signed cert)
│   ├── Start/
│   │   ├── Rules.service.ts         # StartRulesService — the 4-check pipeline
│   │   └── ServiceStatusChecker.service.ts
│   ├── DB/DB_Pool.service.ts        # DNS record + CNAME chain resolution
│   ├── Rules/BlockList.service.ts   # ACL check, 3-layer cache
│   └── Forwarder/GlobalDNSforwarder.service.ts  # Upstream DNS, dedicated per-query socket
└── utilities/
    ├── IDNSIOHandler.ts             # Shared interface: UDP + TCP/TLS handlers implement this
    ├── IO.utls.ts                   # UDP implementation + pure DNS packet parsing
    ├── TCPInputOutputHandler.ts     # TCP/TLS implementation (delegates parsing to IO.utls)
    ├── AutoIP_SCAN.utls.ts          # Detects LAN IP changes, rebinds UDP socket
    └── GetWLANIP.utls.ts

server/source/
├── cluster/Cluster.ts               # Own cluster.fork() bootstrap (same SCHED_RR pattern)
├── core/{fastify.ts,key.ts}         # Fastify app (port 4773), config/RBAC seed data
├── Database/mongodb.db.ts           # Separate connection pool (RBAC seed/index logic)
├── RabbitMQ/Rabbitmq.config.ts      # Separate RabbitMQService (see Known Gaps)
├── Router/ · Controller/ · Services/  # DNS records, Users, Roles, ACL policies,
│                                       # AntiPornMode, AntiAdsMode, DomainGroups,
│                                       # IPGroups, Analytics, Health
└── CronJob/Jobs/
    ├── BatchAnalytics.cron.ts       # Consumes DNS_Analytics queue → analytics collection
    └── LogsExportWorker.cron.ts     # Consumes LOGS_EXPORT queue
```

---

## Core Service Responsibilities

| Service | File | Responsibility |
|---|---|---|
| `StartRulesService` | `Web/src/services/Start/Rules.service.ts` | The single query-processing entrypoint shared by all three transports. Owns the 4-check pipeline, single-flight dedup (`inflight` Map, scoped **per instance** — UDP/TCP/DoT each construct their own `StartRulesService`, so dedup does not cross transports), and the `cache:invalidate` Redis subscription (guarded to register once per process via a static flag) |
| `ServiceStatusChecker` | `.../Start/ServiceStatusChecker.service.ts` | Redis-cached service on/off switch, MongoDB `service` collection fallback |
| `BlockList` | `.../Rules/BlockList.service.ts` | ACL check with 3 cache layers (local `Map` 5s → static global `Map` 3s → Redis `acl:ip:*`/`acl:all_users` sets), wildcard domain matching, fail-open on error |
| `DomainDBPoolService` | `.../DB/DB_Pool.service.ts` | Resolves a domain to its record, walking CNAME chains up to 10 hops via sequential MongoDB `findOne` calls (each hop depends on the previous — cannot be parallelized) |
| `GlobalDNSforwarder` | `.../Forwarder/GlobalDNSforwarder.service.ts` | Forwards each query on its own dedicated, short-lived UDP socket (not a shared singleton) to a shuffled 6-IP pool (Cloudflare/Google/Quad9 unfiltered), 2s per-server timeout with fallthrough. Concurrency capped at 256 in-flight forwards via a counting semaphore (`acquireForwardSlot`/`releaseForwardSlot`) — beyond that, requests queue for a slot rather than opening unbounded sockets |
| `RedisCacheService` | `Web/src/Redis/Redis.cache.ts` | Singleton Redis client: generic CRUD, pub/sub (cache invalidation), ACL-specific reads (`getBlockedDomainsForIP`, `isDomainBlocked`) |
| `RabbitMQService` | `Web/src/RabbitMQ/Rabbitmq.config.ts` (and a separately-maintained copy in `server/source/RabbitMQ/`) | Singleton AMQP client. Queue declarations are memoized per-process (`ensureQueue`) — asserted once, not on every publish/consume call |
| `IDNSIOHandler` implementations | `IO.utls.ts` (UDP), `TCPInputOutputHandler.ts` (TCP/TLS) | Pure DNS packet parsing/building shared by all handlers; TCP/TLS variant delegates parsing to the UDP one and only differs in the 2-byte length-prefixed framing (RFC 1035 §4.2.2) |

---

## Cluster & Concurrency Model

- Both `Web/` and `server/` independently run `cluster.fork()` with `Math.max(1, Math.floor(os.cpus().length * 0.75))` workers and `cluster.schedulingPolicy = cluster.SCHED_RR` for round-robin distribution of incoming connections/datagrams across workers.
- **MongoDB connection pooling is CPU-scaled**, not left at the driver default. Both `mongodb.db.ts` files compute `maxPoolSize` per worker as `clamp(200 / totalUsableCpus, 20, 50)` — a floor of 20 (so a single busy worker always has headroom) and a ceiling of 50 (since DNS/API lookups are single fast document reads, not bulk operations), targeting roughly 200 aggregate connections across the whole cluster rather than `workers × 100` (the driver default) with no coordination.
- **The inbound query socket's UDP buffer is explicitly enlarged** (4MB requested via `setRecvBufferSize`/`setSendBufferSize` in `DNS.Service.ts`), applied only after the socket is confirmed bound (`"listening"` event) — calling these setters on an unbound socket throws. The actual granted size is logged, since the OS caps the request at `net.core.rmem_max`/`wmem_max` regardless of what's asked for; on a stock Linux host with default sysctls (`rmem_max` = `rmem_default` = 212992 bytes), the code-level request is silently clamped back to the default unless that ceiling is separately raised.
- The Docker deployment raises that ceiling automatically: `Scripts/docker-entrypoint.sh` writes to `/proc/sys/net/core/rmem_max`/`wmem_max` at container start (works because the `nexoraldns` service runs `privileged: true` + `network_mode: host` in `docker-compose.yml`/`dev.compose.yaml`, so there's no isolated network namespace — the write lands on the real host value). **The bare-metal `Scripts/install.sh` path does not yet do this** — see Known Gaps.
- **Outbound upstream forwarding uses a dedicated socket per query, not one shared socket, and does not do buffer tuning** — a real production issue (frequent "no response from any DNS server" failures across unrelated domains) traced back to many concurrent queries sharing one forwarder socket: a direct test sending 20 queries through one shared socket at once dropped 19 of them; giving each query its own socket resolved 20/20, repeatably. Since buffer size wasn't the bottleneck (verified: the same loss occurred even with `rmem_max` already raised to 4MB), the fix was architectural, not a tuning knob. This also let the transaction-ID-rewriting/pending-request map the old shared-socket design needed be removed entirely — a dedicated socket has no other query to disambiguate a response from. Concurrent socket creation is capped at 256 in-flight forwards (`MAX_CONCURRENT_FORWARDS`) to bound file-descriptor usage under extreme concurrency; requests beyond the cap queue for a freed slot, trading added latency for staying alive over crashing outright.
- **Single-flight deduplication** prevents duplicate concurrent MongoDB lookups for the same domain, but is scoped to one `StartRulesService` instance — since UDP/TCP/DoT each construct their own instance, and the IP-rebind path also constructs a fresh instance — a cold domain queried simultaneously across transports or immediately after a rebind is not deduplicated against those other instances.
- **RabbitMQ queue declarations are memoized** per process via an `assertedQueues: Set<string>` guard in a shared `ensureQueue()` helper — every `publish`/`consume`/`publishBatch`/`consumeBatch`/`getQueueMessageCount` call site routes through it, so a queue is declared once per process lifetime rather than on every message (a queue is a durable, broker-side object that survives channel/connection drops, so re-declaring it per-message was pure overhead).

---

## Database Schema

Both `Web/` and `server/` connect to the same MongoDB database (`nexoral_db` by default) but register different subsets of collections, matching what each service actually reads/writes.

**`Web/`'s DNS engine reads/writes**: `service`, `dns_records`, `domains`, `analytics` (via `Web/src/Config/key.ts`).

**`server/`'s API additionally manages**: `users`, `roles`, `permissions`, `access_control_policies`, `domain_groups`, `ip_groups`, `session_manage` (via `server/source/core/key.ts`).

### `dns_records`
```typescript
{
  _id: ObjectId,
  name: string,               // domain name, exact-match lookup key
  type: "A" | "CNAME" | ...,  // CNAME triggers chain resolution in DB_Pool.service.ts
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
  policyName: string,
  isActive: boolean,
  createdAt: number, updatedAt: number
}
// Indexes: { policyName: 1 }, { isActive: 1 }, { policyType: 1 }, { targetType: 1 }, { createdAt: -1 }
```

### `domain_groups`
```typescript
{ _id: ObjectId, name: string, isSystemGroup: boolean, domains: string[] /* wildcard-capable */ }
// Indexes: { name: 1 } (unique), { createdAt: -1 }
```

### `analytics`
```typescript
{
  queryName: string, queryType: string, SourceIP: string,
  Status: string,    // DNS_QUERY_STATUS_KEYS: RESOLVED | BLOCKED | SERVICE_DOWN | FAILED | FORWARDED | ...
  From: string,      // FROM_CACHE | FROM_DB | Upstream provider name | FROM_BLOCKED | FROM_FAIL_SAFE
  timestamp: number, duration: number
}
// Published to RabbitMQ (DNS_Analytics queue) from Web/, batch-consumed and
// written here by server/source/CronJob/Jobs/BatchAnalytics.cron.ts.
// Indexes: { timestamp: 1 }, { Status: 1 }, { queryType: 1 }, { From: 1 }, { duration: 1 },
//          { createdAt: 1 } with expireAfterSeconds: 604800 (7-day auto-cleanup),
//          { timestamp: 1, Status: 1 }, { timestamp: 1, queryType: 1 }, { timestamp: -1 }
```

### `users` / `roles` / `permissions` / `session_manage`
See [RBAC & User Management](#rbac--user-management) below — unchanged from the existing RBAC implementation.

---

## Redis Caching Strategy

Actual key scheme (`Web/src/Redis/CacheKeys.cache.ts`) — narrower than earlier drafts of this document suggested:

```typescript
enum CacheKeys {
  Service_Status = "dns-server-status",
  Domain_DNS_Record = "Domain_DNS_Record",   // used as `${Domain_DNS_Record}:${queryName}`
  Block_Domains = "Blocked_Domain"
}

enum QueueKeys {
  DNS_Analytics = "DNS_analytcs"             // [sic] — RabbitMQ queue name, not a Redis key
}
```

**ACL / block-list keys** (read by `Redis.cache.ts`'s `isDomainBlocked`/`getBlockedDomainsForIP`/`getGloballyBlockedDomains`): `acl:ip:<ip>` (Redis Set, per-IP blocked domains) and `acl:all_users` (Redis Set, global blocks) — populated by a cron job in `server/`, not by the DNS engine itself. Entries may be plain domain strings or JSON `{domain, isWildcard}` objects; wildcard matching supports `*.example.com` (subdomain), `example.*` (prefix), and bare `*` (block everything).

**Record cache**: `${Domain_DNS_Record}:${queryName}` → the resolved record JSON, TTL = the record's own `ttl` field. Set both on a fresh MongoDB resolution and on a successful upstream forward.

**Cache invalidation**: pub/sub on the `cache:invalidate` channel (not a polling/expiry-only model) — on receipt, `BlockList.clearAllCaches()` clears both in-process Map caches and the `Service_Status` Redis key is deleted, forcing the next query to re-read from MongoDB. The subscription is registered once per process (guarded by a static flag on `StartRulesService`), regardless of how many transport listeners construct their own instance.

---

## RBAC & User Management

This is the admin-facing management layer on top of the existing RBAC primitives (`users`, `roles`, `permissions` collections — see `server/source/core/key.ts` and `server/source/Database/mongodb.db.ts` for the seeded permission catalog and default roles). It is administrative surface, not part of the DNS query path.

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

## 🔞 Anti-Porn Mode Feature

### Overview

NexoralDNS includes a built-in **Anti-Porn Mode** feature that provides easy-to-use adult content filtering at the DNS level. This feature blocks access to a pre-seeded list of known adult content websites and can be enabled for specific users, IP groups, or globally across your entire network. It's a thin, purpose-built layer on top of the general `access_control_policies` / `domain_groups` ACL system described above — not a separate blocking mechanism.

### Key Features

1. **Pre-configured Domain List**: 100+ adult content domains, auto-seeded at server startup
2. **Flexible Targeting**: Block for specific IPs, IP groups, or all users
3. **Easy Management**: Simple UI for enabling/disabling policies
4. **Real-time Updates**: Changes propagate via the `cache:invalidate` Redis pub/sub channel described above
5. **No separate enforcement path**: Uses the same ACL check every other block policy uses (`BlockList.service.ts`)

### Architecture

#### Server Components

**1. Domain Group (Adult Content)**
- **Collection**: `domain_groups`, `isSystemGroup: true`, name `"Adult Content (Anti-Porn)"`
- Auto-created/updated on server restart

**2. AntiPornMode Service** — `server/source/Services/AntiPornMode/AntiPornMode.service.ts`
- `enableAntiPornMode(params)`, `disableAntiPornMode(policyId)`, `toggleAntiPornMode(policyId)`, `getAntiPornModeStatus(filter)`, `isEnabledForIP(ip)`

**3. AntiPornMode Controller** — `server/source/Controller/AntiPornMode/AntiPornMode.controller.ts`, routed at `/api/anti-porn-mode`

#### Client Components

- `client/components/anti-porn-mode/AntiPornPolicyModal.jsx` — 2-step wizard (target selection → details)
- `client/components/anti-porn-mode/AntiPornModeSection.jsx` — dashboard grid view, toggle/delete/filter
- Integrated at `client/app/dashboard/access-control/page.js` ("Anti-Porn Mode" tab)

### API Endpoints

```typescript
POST   /api/anti-porn-mode/enable
DELETE /api/anti-porn-mode/:policyId
PATCH  /api/anti-porn-mode/:policyId/toggle
GET    /api/anti-porn-mode/status?filter=all|active|inactive
GET    /api/anti-porn-mode/check-ip/:ip
```

`enable` body:
```typescript
{
  targetType: 'single_ip' | 'multiple_ips' | 'ip_group' | 'multiple_ip_groups' | 'all',
  targetIP?: string, targetIPs?: string[],
  targetIPGroup?: string, targetIPGroups?: string[],
  policyName?: string
}
```

### How It Works

1. On server startup, the adult content domain group is created/updated if missing
2. Enabling the mode creates a policy linking the target (IP/group/all) to that domain group
3. On each DNS query, `BlockList.service.ts` checks active policies exactly as it would for any other block rule — no special-cased fast path
4. Policy changes trigger the `cache:invalidate` pub/sub event, clearing in-process caches across all workers within the cache's own TTL window (3-5s)

### Maintenance

- Add domains: edit `server/source/Constants/AdultContentDomains.constant.ts`, restart to re-seed
- Check status: `mongo nexoral_db --eval "db.domain_groups.findOne({ isSystemGroup: true, name: 'Adult Content (Anti-Porn)' })"`
- Debug: `redis-cli keys "acl:*"`, server logs prefixed `[Anti-Porn]`

---

## 🛡️ Anti-Ads Mode Feature

### Overview

Same mechanism as Anti-Porn Mode, targeting advertising/tracking domains instead — a domain group (`"Ads & Trackers (Anti-Ads)"`, 200+ domains sourced from Hagezi/AdGuard/EasyList) linked to ACL policies via the same `access_control_policies` system.

### Architecture

- **Service**: `server/source/Services/AntiAdsMode/AntiAdsMode.service.ts` — `enableAntiAdsMode`, `disableAntiAdsMode`, `toggleAntiAdsMode`, `getAntiAdsModeStatus`, `isEnabledForIP`
- **Controller**: `server/source/Controller/AntiAdsMode/AntiAdsMode.controller.ts`, routed at `/api/anti-ads-mode`
- **Client**: `client/components/anti-ads-mode/{AntiAdsPolicyModal,AntiAdsModeSection}.jsx`, `client/app/dashboard/access-control/page.js` ("Anti-Ads Mode" tab)

### API Endpoints

```typescript
POST   /api/anti-ads-mode/enable      // same body shape as anti-porn-mode
DELETE /api/anti-ads-mode/:policyId
PATCH  /api/anti-ads-mode/:policyId/toggle
GET    /api/anti-ads-mode/status?filter=all|active|inactive
GET    /api/anti-ads-mode/check-ip/:ip
```

### Domain Categories (200+ total)

Google Ads/Analytics, Meta/Facebook tracking, major ad networks & exchanges (Amazon, Bing, AppNexus, Criteo, Outbrain, Taboola), analytics/tracking services (Adobe, Hotjar, Mixpanel, Segment, Comscore), social media pixels, mobile ad networks (AdMob, InMobi, Unity, Vungle), video ad platforms, retargeting networks, affiliate tracking, aggressive pop-up ad networks, ad CDN infrastructure.

### Maintenance

- Add domains: edit `server/source/Constants/AdBlockingDomains.constant.ts`, update `lastUpdated`/`version` metadata, restart to re-seed
- Check status: `mongo nexoral_db --eval "db.domain_groups.findOne({ isSystemGroup: true, name: 'Ads & Trackers (Anti-Ads)' })"`
- Debug: `redis-cli keys "acl:*"`, server logs prefixed `[Anti-Ads]`

### Security notes (both modes)

Input validation, safe ObjectId conversion (NoSQL injection prevention), policy-name sanitization, array size limits (100 IPs / 50 groups) on policy creation, sanitized error responses, JWT-gated endpoints.

---

## Performance Targets

These are **targets the design aims for, not numbers verified by a load test** — there is currently no automated benchmark in this repo beyond a `dnsperf` query list (`Test/dnsperf.txt`, 49 domains) with no captured results. Treat the table below as an engineering goal, not a measured SLA.

| Path | Target Latency | What actually happens |
|-------|---------------|-------|
| Redis cache hit (record + service status) | **<2ms** | 2 sequential Redis round trips (service status, then record) — intentionally sequential, not parallelized, because either check can short-circuit the query before the more expensive path runs |
| MongoDB lookup (cache miss) | **<5ms** | Single-flight-deduped `findOne`, sequential per CNAME hop (1 hop = 1 round trip; a 10-hop chain is ~10x a direct hit) |
| Upstream forward | **<50ms** | 2s timeout per upstream server, automatic fallthrough across a shuffled 6-IP/3-provider pool (worst case 12s if all 6 fail), on a dedicated per-query socket |

A rough capacity model derived from reading the code (not a benchmark — see [Testing](#testing)): aggregate steady-state throughput scales with cluster width and available hardware, roughly **hundreds of QPS on Raspberry Pi-class hardware up to tens of thousands of QPS on dedicated multi-core servers**, with MongoDB (not the Node event loop or Redis) becoming the bottleneck under sustained cache-miss-heavy load. Domain concentration (how many clients share the same popular domains vs. each hitting unique long-tail ones) matters more than raw device count, since the Redis record cache benefits *all* clients querying a given domain within its TTL window, not just the client that populated it.

---

## Operational Resilience

- **Fail-safe on DB outage**: `Rules.service.ts` catches MongoDB errors at the service-status and ACL-check stages and sets `databaseOffline = true`, bypassing policy enforcement rather than returning SERVFAIL — the query still resolves via cache or upstream forward.
- **Fail-open on ACL errors**: `BlockList.checkDomain` and `RedisCache.isDomainBlocked` both return `false` (allow) on internal errors rather than blocking all traffic.
- **Multi-provider upstream forwarding**: 3 providers, 6 IPs (Cloudflare, Google, Quad9 unfiltered), shuffled per query, 2s per-server timeout with automatic fallthrough to the next provider on timeout or send failure — each query on its own dedicated socket, so one slow/failing query can't affect another's attempts.
- **Automatic LAN IP rebinding**: `AutoIP_SCAN.utls.ts` polls the local IP every 10s (`Retry.Seconds`) and rebinds the UDP socket if it changes (e.g., DHCP lease renewal on the host itself), re-attaching all listeners and reconstructing `StartRulesService` to avoid stale-socket errors on in-flight queries.
- **Self-signed DoT certificates**: auto-generated via `openssl` on first startup if absent, persisted to `/etc/nexoral/cert` (configurable via `DOT_CERT_DIR`) so the same cert survives restarts.

---

## Known Gaps & Non-Goals

Honest list, current as of this document's last update — not aspirational:

1. **No automated test suite.** `Test/` contains only a `dnsperf` query list and a docker-compose for test infra — no unit or integration tests for either `Web/` or `server/`. This is a real gap against this project's own `CLAUDE.md` testing rule.
2. **No real-time metrics/observability.** Analytics land in MongoDB via a RabbitMQ batch consumer — queryable after the fact, but no live p50/p95/p99 dashboard. The sub-5ms targets above cannot currently be verified in production without manual querying.
3. **Duplicated infrastructure code between `Web/` and `server/`.** `mongodb.db.ts` and `Rabbitmq.config.ts` each exist as separate, hand-copied files in both services (they're separate PM2-managed process trees and can't share a live in-memory connection, but the *source* is duplicated, not just the runtime instance). This already caused one real bug — an `assertQueue` argument mismatch between `Web`'s publisher and `server`'s consumer paths — that existed in both copies and had to be found and fixed in both independently. A shared, versioned local package was scoped as the fix but deferred by design choice.
4. **Bare-metal deployment doesn't get the UDP buffer fix.** `Scripts/docker-entrypoint.sh` raises `net.core.rmem_max`/`wmem_max` for the Docker path; `Scripts/install.sh` (the bare-metal LAN install path) does not yet do the equivalent.
5. **No domain rerouting/rewriting** and **no per-user plan gating** in the DNS query path, despite both being mentioned as product features elsewhere (`CLAUDE.md`, `FEATURES.md`) — see the note in [System Overview](#system-overview).
6. **MongoDB connection pool sizing assumes co-location isn't extreme.** The CPU-scaled `maxPoolSize` targets ~200 aggregate connections for `Web/`'s cluster and another ~200 for `server/`'s cluster independently — the two don't coordinate with each other, so total real connection load against one MongoDB instance is the sum of both, not a jointly-tuned number.

---

## Testing

**Current state**: `Test/` contains `dnsperf.txt` (a 49-domain query list for the external `dnsperf` load-testing tool) and a `docker-compose.yml` for spinning up test infrastructure (Mongo/Redis/RabbitMQ) — no automated unit or integration tests exist for either `Web/` or `server/` today.

**Recommended immediate next step**: run `dnsperf` against a live instance —

```bash
dnsperf -d Test/dnsperf.txt -s <server-ip> -p 53 -c 100 -l 60
```

— on hardware matching the real target deployment, to replace the capacity estimates in this document with measured numbers.

**Per this project's `CLAUDE.md`** ("ALWAYS test: Add/update tests in `Test/` for ANY feature change"), new feature work should come with tests even though the existing baseline doesn't have them yet.

---

## Deployment

LAN-only — see `CLAUDE.md`. Two supported paths:

### Docker (`Scripts/docker-compose.yml` / `dev.compose.yaml`)
- `nexoraldns` service: `network_mode: host`, `privileged: true`, `cap_add: [NET_ADMIN]` — required to bind port 53/853 and to tune host-level UDP socket buffers
- `Scripts/docker-entrypoint.sh` raises `net.core.rmem_max`/`wmem_max` to 4MB at container start before launching `pm2-runtime start ecosystem.config.js`
- Mongo/Redis/RabbitMQ run as sibling containers with host-mapped ports for `127.0.0.1` access from the host-networked app container

### Bare-metal (`Scripts/install.sh`)
- Installs Node, PM2, and the four services directly on the host
- Does **not** currently raise the OS-level UDP buffer ceiling (see [Known Gaps](#known-gaps--non-goals))

Both paths run four PM2-managed processes per `ecosystem.config.js`: `server` (Fastify API), `client` (Next.js dashboard), `dhcp` (DHCP server), `web` (this DNS engine) — each restarting independently (`restart_delay: 5000`, `max_restarts: 3`) on crash.

---

## Security Considerations

1. **Input validation**: domain names sanitized before DNS packet construction and MongoDB queries; ACL policy inputs validated with array size limits and safe `ObjectId` conversion
2. **Fail-open, not fail-closed, on internal errors**: a deliberate choice (see [Operational Resilience](#operational-resilience)) — an ACL/DB outage degrades policy enforcement rather than taking down LAN-wide DNS resolution
3. **No public exposure**: this is explicitly a LAN-only system — never expose port 53/853 or the API (4773) to the public internet; ISPs will block DNS behavior that looks like spoofing from a public IP
4. **JWT-based admin authentication** with `session_manage` collection tracking access/refresh tokens, auto-expiring inactive sessions after 48h
5. **Self-lockout guards** on admin user/role mutation endpoints (see RBAC section)
6. **Rate limiting**: not verified as implemented for the DNS query path itself in this pass — worth confirming before treating this as a defense against query floods

---

## Future Optimizations

Roughly in priority order based on what's actually been found gap-hunting this codebase, not a wishlist:

1. **Extract shared Mongo/RabbitMQ connection code** into a versioned local package (npm workspaces or `file:` dependency) consumed by both `Web/` and `server/`, closing the duplication gap in [Known Gaps](#known-gaps--non-goals)
2. **Add a test suite** — unit tests for `Rules.service.ts`'s 4-check pipeline, `BlockList.service.ts`'s wildcard matching, `DB_Pool.service.ts`'s CNAME chain resolution and circular-reference detection
3. **Real load testing** via `dnsperf` against representative target hardware to replace estimated capacity numbers with measured ones
4. **Real-time metrics** (Prometheus/Grafana or similar) for p50/p95/p99 query latency, cache hit rate, and per-layer timing — currently only available after-the-fact via the `analytics` collection
5. **Bare-metal UDP buffer parity** — add the equivalent of `Scripts/docker-entrypoint.sh`'s sysctl tuning to `Scripts/install.sh`
6. DNSSEC support, full IPv6/AAAA support, geo-based routing — longer-term, not currently scoped

---

## Support & Maintenance

### Log Locations (Docker/PM2 — see `ecosystem.config.js`)
- DNS engine (`Web/`): `/var/log/web.log`, `/var/log/web.err.log`
- API (`server/`): `/var/log/server.log`, `/var/log/server.err.log`
- Dashboard (`client/`): `/var/log/client.log`, `/var/log/client.err.log`
- DHCP: `/var/log/dhcp.log`, `/var/log/dhcp.err.log`

### Common Checks

```bash
# Is port 53 actually listening?
sudo netstat -tulpn | grep :53

# PM2 process status / logs
pm2 status
pm2 logs web --lines 100

# ACL cache contents
redis-cli keys "acl:*"

# Slow MongoDB queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- **Ankan Saha** - Initial architecture and implementation

---

**Last Updated:** 2026-07-02
**Version:** 4.7.46-stable
