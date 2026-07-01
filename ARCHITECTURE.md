# NexoralDNS Complete Architecture Documentation

## 📖 Table of Contents
1. [System Overview](#system-overview)
2. [Flow Diagrams](#flow-diagrams)
3. [System Design](#system-design)
4. [Database Schema](#database-schema)
5. [RBAC & User Management](#rbac--user-management)
6. [Performance Targets](#performance-targets)

---

## System Overview

NexoralDNS is a high-performance DNS server with advanced features including:
- **Sub-5ms query response times** with Redis caching
- **Domain rerouting** (e.g., google.com → ankan.site)
- **Domain blocking** (ads, malware, custom blocks)
- **User plan management** with feature limits
- **Analytics & logging** for query monitoring
- **Multi-client support** with client-specific rules

---

## Flow Diagrams

### 1. High-Level DNS Query Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT DNS QUERY                             │
│                     (e.g., google.com A record)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      UDP DNS Server (Port 53)                        │
│                        DNS.Service.ts                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Rules.service.ts (Main Logic)                    │
│                    ┌──────────────────────────┐                      │
│                    │   7-Layer Check System   │                      │
│                    └──────────────────────────┘                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   [CACHE HIT]           [DB LOOKUP]           [UPSTREAM DNS]
   Return <2ms           Return <5ms           Return <50ms
```

### 2. Detailed 7-Layer Query Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING DNS QUERY                           │
│                  Client IP: 192.168.1.5 | Domain: google.com        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  LAYER 1: CACHE     │ ⚡ 0.5-1ms
                    │  Redis Lookup       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Cache Hit?        │
                    └──┬──────────────┬───┘
                  YES  │              │ NO
           ┌───────────▼─────┐        │
           │ Return Response │        │
           │   ✓ DONE (1ms)  │        │
           └─────────────────┘        │
                                      │
                           ┌──────────▼──────────┐
                           │ LAYER 2: SERVICE    │ ⚡ 0.5ms
                           │ Status Check        │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │  Service Active?    │
                           └──┬──────────────┬───┘
                          NO  │              │ YES
                   ┌──────────▼─────┐        │
                   │ Return NXDOMAIN│        │
                   │  ✓ DONE (1ms)  │        │
                   └────────────────┘        │
                                             │
                                  ┌──────────▼──────────┐
                                  │ LAYER 3: BLOCK LIST │ ⚡ 0.5ms
                                  │ Check if Blocked    │
                                  └──────────┬──────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │   Domain Blocked?   │
                                  └──┬──────────────┬───┘
                                YES  │              │ NO
                         ┌───────────▼─────┐        │
                         │ Return NXDOMAIN │        │
                         │ + Log Block     │        │
                         │  ✓ DONE (2ms)   │        │
                         └─────────────────┘        │
                                                     │
                                          ┌──────────▼──────────┐
                                          │ LAYER 4: REWRITE    │ ⚡ 1ms
                                          │ Check Reroute Rules │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Rewrite Rule?      │
                                          └──┬──────────────┬───┘
                                        YES  │              │ NO
                                 ┌───────────▼─────┐        │
                                 │ Lookup Target   │        │
                                 │ Domain IP       │        │
                                 │ Return Rerouted │        │
                                 │  ✓ DONE (3ms)   │        │
                                 └─────────────────┘        │
                                                             │
                                                  ┌──────────▼──────────┐
                                                  │ LAYER 5: DNS RECORD │ ⚡ 2ms
                                                  │ MongoDB Lookup      │
                                                  └──────────┬──────────┘
                                                             │
                                                  ┌──────────▼──────────┐
                                                  │  Record Found?      │
                                                  └──┬──────────────┬───┘
                                                YES  │              │ NO
                                         ┌───────────▼─────┐        │
                                         │ Check User Plan │        │
                                         │ Return Record   │        │
                                         │  ✓ DONE (4ms)   │        │
                                         └─────────────────┘        │
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │ LAYER 6: USER PLAN  │ ⚡ 0.5ms
                                                          │ Validation (if user)│
                                                          └──────────┬──────────┘
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │ LAYER 7: UPSTREAM   │ ⚡ 10-50ms
                                                          │ Forward to 8.8.8.8  │
                                                          └──────────┬──────────┘
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │ Cache Response      │
                                                          │ Return to Client    │
                                                          │  ✓ DONE (40ms)      │
                                                          └─────────────────────┘
```

### 3. System Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │  Web UI  │  │  Mobile  │  │   CLI    │  │  DNS     │                    │
│  │ (Next.js)│  │   App    │  │  Client  │  │  Client  │                    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                    │
└───────┼─────────────┼─────────────┼─────────────┼────────────────────────────┘
        │             │             │             │
        │ HTTP/REST   │ HTTP/REST   │ UDP:53      │ UDP:53
        │             │             │             │
┌───────▼─────────────▼─────────────┼─────────────┼────────────────────────────┐
│                   API SERVER (Fastify)           │                            │
│  ┌────────────────────────────────────────┐     │                            │
│  │          REST API Endpoints            │     │                            │
│  │  • /api/rewrites   • /api/blocks       │     │                            │
│  │  • /api/dns        • /api/analytics    │     │                            │
│  │  • /api/plans      • /api/auth         │     │                            │
│  └────────────────┬───────────────────────┘     │                            │
│                   │                              │                            │
│  ┌────────────────▼───────────────────────┐     │                            │
│  │         Controllers Layer              │     │                            │
│  │  • DNS.controller                      │     │                            │
│  │  • Rewrite.controller                  │     │                            │
│  │  • Block.controller                    │     │                            │
│  │  • Plan.controller                     │     │                            │
│  └────────────────┬───────────────────────┘     │                            │
│                   │                              │                            │
│  ┌────────────────▼───────────────────────┐     │                            │
│  │         Services Layer                 │     │                            │
│  │  • Add_DNS.service                     │     │                            │
│  │  • DNS_List.service                    │     │                            │
│  │  • DNS_Update.service                  │     │                            │
│  │  • DNS_Delete.service                  │     │                            │
│  └────────────────┬───────────────────────┘     │                            │
└─────────────────────┼──────────────────────────────────────────────────────────┘
                      │                             │
        ┌─────────────▼────────┐                    │
        │                      │                    │
┌───────▼────────┐    ┌────────▼────────┐          │
│   MongoDB      │    │   Redis Cache   │          │
│                │    │                 │          │
│ • dns_records  │    │ • service:*     │          │
│ • dns_rewrites │    │ • dns:*         │◄─────────┼────────┐
│ • dns_blocks   │    │ • rewrite:*     │          │        │
│ • user_plans   │    │ • block:*       │          │        │
│ • query_logs   │    │ • response:*    │          │        │
│ • domains      │    │ • plan:*        │          │        │
└────────────────┘    └─────────────────┘          │        │
                                                    │        │
┌───────────────────────────────────────────────────▼────────┼────────────────┐
│                      DNS SERVICE (UDP:53)                  │                │
│  ┌─────────────────────────────────────────────────────┐   │                │
│  │              DNS.Service.ts                         │   │                │
│  │  • Listens on UDP Port 53                           │   │                │
│  │  • Handles DNS packets (A, AAAA, CNAME, etc.)       │   │                │
│  └─────────────────┬───────────────────────────────────┘   │                │
│                    │                                        │                │
│  ┌─────────────────▼───────────────────────────────────┐   │                │
│  │            Rules.service.ts                         │   │                │
│  │  • 7-Layer Query Processing                         │   │                │
│  │  • Redis Cache Integration                          │   │                │
│  │  • Service Status Check                             │   │                │
│  │  • Block List Validation                            │───┼────────────────┤
│  │  • Rewrite Rule Execution                           │   │                │
│  │  • DNS Record Lookup                                │   │                │
│  │  • User Plan Validation                             │   │                │
│  │  • Upstream DNS Forwarding                          │   │                │
│  └─────────────────┬───────────────────────────────────┘   │                │
│                    │                                        │                │
│  ┌─────────────────▼───────────────────────────────────┐   │                │
│  │          Supporting Services                        │   │                │
│  │  • DB_Pool.service      (DNS record lookups)        │   │                │
│  │  • Rewrite.service      (Rewrite rules)             │   │                │
│  │  • Block.service        (Block list)                │   │                │
│  │  • UserPlan.service     (Plan validation)           │   │                │
│  │  • QueryLogger.service  (Batch logging)             │   │                │
│  │  • GlobalDNSforwarder   (Upstream DNS)              │   │                │
│  └─────────────────────────────────────────────────────┘   │                │
└────────────────────────────────────────────────────────────┴────────────────┘
                                 │
                                 │ Forward Unresolved
                                 ▼
                    ┌────────────────────────┐
                    │  UPSTREAM DNS SERVERS  │
                    │  • 8.8.8.8 (Google)    │
                    │  • 1.1.1.1 (Cloudflare)│
                    │  • Custom DNS          │
                    └────────────────────────┘
```

---

## System Design

### Component Breakdown

#### 1. **Client Layer**
- **Web UI** (Next.js): User dashboard for managing DNS records, rewrites, blocks
- **Mobile App**: Mobile client for DNS management
- **CLI Client**: Command-line interface for power users
- **DNS Clients**: Any device using the DNS server (phones, laptops, IoT)

#### 2. **API Server Layer** (Port 4000 - Fastify)
- **REST API**: HTTP endpoints for CRUD operations
- **Controllers**: Request validation and routing
- **Services**: Business logic and database operations
- **Authentication**: JWT-based user authentication
- **Rate Limiting**: Prevent API abuse

#### 3. **DNS Server Layer** (Port 53 - UDP)
- **DNS.Service.ts**: Main UDP server listening on port 53
- **Rules.service.ts**: Core query processing with 7-layer checks
- **Supporting Services**: Database lookups, caching, logging
- **Global DNS Forwarder**: Upstream DNS resolution

#### 4. **Caching Layer** (Redis)
- **Purpose**: Sub-millisecond query responses
- **Cache Types**:
  - Full DNS responses (binary packets)
  - DNS records (JSON)
  - Service status
  - Rewrite rules
  - Block lists
  - User plans
- **TTL Strategy**: Variable TTLs (60s - 600s)
- **Cache Warming**: Preload hot data on startup

#### 5. **Database Layer** (MongoDB)
- **Collections**:
  - `dns_records`: A, AAAA, CNAME records
  - `dns_rewrites`: Domain rerouting rules
  - `dns_blocks`: Blocked domains
  - `user_plans`: Subscription management
  - `dns_query_logs`: Analytics data (30-day TTL)
  - `domains`: User-owned domains
  - `service`: Service configuration
- **Indexing**: Optimized indexes for fast lookups

#### 6. **Logging & Analytics**
- **QueryLogger.service**: Batch writes every 5s (100 queries)
- **Metrics**: Response times, cache hit rate, query types
- **Storage**: 30-day retention with automatic cleanup

---

## Database Schema

### 1. DNS_REWRITES (Domain Rerouting)

```typescript
{
  _id: ObjectId,
  userId: ObjectId | null,           // null = global rule
  sourceDomain: "google.com",
  targetDomain: "ankan.site",
  targetIP: "1.2.3.4",               // Optional direct IP
  applyToClients: ["192.168.1.5"],   // [] = all clients
  enabled: true,
  ttl: 300,
  priority: 10,                      // Lower = higher priority
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ sourceDomain: 1, enabled: 1 }
{ userId: 1 }
```

**Use Case**: Redirect google.com → ankan.site for specific clients or globally

---

### 2. DNS_BLOCKS (Domain Blocking)

```typescript
{
  _id: ObjectId,
  userId: ObjectId | null,           // null = global block
  domain: "ads.google.com",
  blockType: "exact" | "wildcard",   // exact or *.domain.com
  applyToClients: ["192.168.1.10"],  // [] = all clients
  enabled: true,
  reason: "Malware" | "Ads" | "Custom",
  createdAt: Date
}

// Indexes
{ domain: 1, enabled: 1 }
{ userId: 1 }
```

**Use Case**: Block ads, malware, or unwanted domains

---

### 3. USER_PLANS (Subscription Management)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  planType: "free" | "pro" | "enterprise",
  features: {
    maxRewrites: 10,
    maxBlocks: 100,
    customDNS: true,
    analyticsEnabled: true
  },
  expiresAt: Date,
  status: "active" | "expired" | "suspended",
  createdAt: Date
}

// Indexes
{ userId: 1 }
{ status: 1, expiresAt: 1 }
```

**Use Case**: Limit features based on subscription plan

---

### 4. DNS_QUERY_LOGS (Analytics)

```typescript
{
  _id: ObjectId,
  queryDomain: "google.com",
  clientIP: "192.168.1.5",
  queryType: "A" | "AAAA" | "CNAME",
  responseType: "cached" | "db" | "upstream" | "blocked" | "rerouted",
  responseTime: 2.5,                 // milliseconds
  timestamp: Date,
  userId: ObjectId                   // If domain belongs to user
}

// Indexes (with 30-day TTL)
{ timestamp: 1 }, { expireAfterSeconds: 2592000 }
{ userId: 1, timestamp: -1 }
{ clientIP: 1 }
```

**Use Case**: Track query patterns, performance metrics, and generate analytics

---

## Performance Targets

| Check | Target Latency | Notes |
|-------|---------------|-------|
| Redis Cache Hit | **0.5-1ms** | 80%+ hit rate expected |
| Service Status | **0.5ms** | Cached in Redis |
| Block Check | **0.5ms** | Redis SET lookup |
| Rewrite Check | **1ms** | Redis + fallback DB |
| DNS Record DB | **2-3ms** | Redis + MongoDB |
| User Plan Check | **0.5ms** | Cached in Redis |
| Upstream DNS | **10-50ms** | Only for uncached |
| **Total (Cached)** | **<2ms** | 🎯 Target |
| **Total (Uncached DB)** | **<5ms** | 🎯 Target |
| **Total (Upstream)** | **<50ms** | Acceptable |

---

## Redis Caching Strategy

### Cache Keys Structure

```typescript
// 1. Service Status (TTL: 60s)
redis.set('service:status', 'active', 'EX', 60)

// 2. DNS Records (TTL: 300s or record TTL)
redis.set('dns:google.com', '{"value":"1.2.3.4","ttl":300}', 'EX', 300)

// 3. Rewrites (TTL: 300s)
redis.set('rewrite:google.com:192.168.1.5', '{"target":"ankan.site"}', 'EX', 300)
redis.set('rewrite:google.com:global', '{"target":"ankan.site"}', 'EX', 300)

// 4. Blocks (TTL: 600s)
redis.sadd('block:global', 'ads.google.com')
redis.sadd('block:client:192.168.1.5', 'facebook.com')

// 5. User Plans (TTL: 300s)
redis.set('plan:userId:507f1f77bcf86cd799439011', '{"status":"active"}', 'EX', 300)

// 6. Full DNS Response Cache (TTL: varies)
redis.set('response:A:google.com', '<binary_dns_packet>', 'EX', 300)
```

---

## Additional Database Collections

### 1. DNS_REWRITES Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                    // null = global rule
  sourceDomain: "google.com",
  targetDomain: "ankan.site",
  targetIP: "1.2.3.4",                 // Optional direct IP
  applyToClients: ["192.168.1.5"],    // Empty = all clients
  enabled: true,
  ttl: 300,
  priority: 10,                        // Lower = higher priority
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
db.dns_rewrites.createIndex({ sourceDomain: 1, enabled: 1 })
db.dns_rewrites.createIndex({ userId: 1 })
```

**Purpose:** Store domain rerouting rules (e.g., google.com → ankan.site)

---

### 2. DNS_BLOCKS Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                    // null = global block
  domain: "ads.google.com",
  blockType: "exact" | "wildcard",     // *.ads.google.com
  applyToClients: ["192.168.1.10"],   // Empty = all clients
  enabled: true,
  reason: "Malware/Ads/Custom",
  createdAt: Date
}
```

**Indexes:**
```javascript
db.dns_blocks.createIndex({ domain: 1, enabled: 1 })
db.dns_blocks.createIndex({ userId: 1 })
```

**Purpose:** Block specific domains for all clients or specific IPs

---

### 3. USER_PLANS Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  planType: "free" | "pro" | "enterprise",
  features: {
    maxRewrites: 10,
    maxBlocks: 100,
    customDNS: true,
    analyticsEnabled: true
  },
  expiresAt: Date,
  status: "active" | "expired" | "suspended",
  createdAt: Date
}
```

**Indexes:**
```javascript
db.user_plans.createIndex({ userId: 1 })
db.user_plans.createIndex({ status: 1, expiresAt: 1 })
```

**Purpose:** Manage user subscription plans and feature limits

---

### 4. DNS_QUERY_LOGS Collection

```typescript
{
  _id: ObjectId,
  queryDomain: "google.com",
  clientIP: "192.168.1.5",
  queryType: "A",
  responseType: "cached" | "db" | "upstream" | "blocked" | "rerouted",
  responseTime: 2.5,                   // ms
  timestamp: Date,
  userId: ObjectId                     // If domain belongs to user
}
```

**Indexes (with TTL for auto-cleanup):**
```javascript
db.dns_query_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }) // 30 days
db.dns_query_logs.createIndex({ userId: 1, timestamp: -1 })
db.dns_query_logs.createIndex({ clientIP: 1 })
```

**Purpose:** Analytics and monitoring of DNS queries

---

## RBAC & User Management

This is the admin-facing management layer on top of the existing RBAC primitives (`users`, `roles`, `permissions` collections — see `server/source/core/key.ts` and `server/source/Database/mongodb.db.ts` for the seeded permission catalog and default roles). It is administrative surface, not part of the 7-layer DNS query path.

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

## ⚡ Redis Caching Strategy

### Cache Keys Structure

```typescript
// 1. Service Status (TTL: 60s)
redis.set('service:status', 'active', 'EX', 60)

// 2. DNS Records (TTL: 300s or record TTL)
redis.set('dns:A:google.com', '{"value":"1.2.3.4","ttl":300}', 'EX', 300)

// 3. Rewrites (TTL: 300s)
redis.set('rewrite:google.com:192.168.1.5', '{"target":"ankan.site","ttl":300}', 'EX', 300)
redis.set('rewrite:google.com:global', '{"target":"ankan.site","ttl":300}', 'EX', 300)

// 4. Blocks (TTL: 600s)
redis.sadd('block:global', 'ads.google.com')
redis.sadd('block:client:192.168.1.5', 'facebook.com')
redis.expire('block:global', 600)

// 5. User Plans (TTL: 300s)
redis.set('plan:userId:507f1f77bcf86cd799439011', '{"status":"active","plan":"pro"}', 'EX', 300)

// 6. Full DNS Response Cache (TTL: varies)
redis.set('response:A:google.com', '<binary_dns_packet>', 'EX', 300)
```

### Cache Warming Strategy

On server startup, preload:
1. Service status
2. Top 1000 queried domains (from analytics)
3. All active rewrites
4. All block lists
5. Active user plans

---

## 🚀 Core Services Architecture

### Directory Structure

```
Web/src/services/
├── DNS/
│   └── DNS.Service.ts              # Main UDP DNS server
├── Start/
│   ├── Rules.service.ts            # Query processing logic (OPTIMIZED)
│   └── ServiceStatusChecker.service.ts
├── DB/
│   ├── DB_Pool.service.ts          # DNS record lookups
│   ├── Rewrite.service.ts          # NEW: Rewrite rules
│   ├── Block.service.ts            # NEW: Block list management
│   └── UserPlan.service.ts         # NEW: User plan validation
├── Cache/
│   └── Redis.service.ts            # NEW: Redis caching layer
├── Forwarder/
│   └── GlobalDNSforwarder.service.ts
└── Logging/
    └── QueryLogger.service.ts      # NEW: Batch query logging

server/source/
├── Controller/
│   ├── DNS/DNS.controller.ts
│   ├── Rewrite/Rewrite.controller.ts  # NEW
│   ├── Block/Block.controller.ts      # NEW
│   └── Plan/Plan.controller.ts        # NEW
├── Services/
│   ├── DNS/
│   ├── Rewrite/                       # NEW
│   ├── Block/                         # NEW
│   └── Plan/                          # NEW
└── Router/
    ├── DNS/DNS.route.ts
    ├── Rewrite/Rewrite.route.ts       # NEW
    ├── Block/Block.route.ts           # NEW
    └── Plan/Plan.route.ts             # NEW
```

---

## 🔧 Service Implementations

### 1. Redis.service.ts

**Location:** `/Web/src/services/Cache/Redis.service.ts`

**Purpose:** Singleton Redis client for all caching operations

**Key Methods:**
- `getServiceStatus()` - Check if DNS service is active
- `getCachedResponse()` - Get full DNS response from cache
- `cacheResponse()` - Store DNS response
- `isBlocked()` - Check if domain is blocked
- `getRewrite()` - Get rewrite rule
- `getDNSRecord()` - Get DNS record from cache
- `getUserPlan()` - Get user plan status
- `invalidateDomain()` - Clear cache for specific domain

**Implementation:**
```typescript
import { createClient, RedisClientType } from 'redis';
import { Console } from 'outers';

export default class RedisCache {
  private static instance: RedisCache;
  private client: RedisClientType;

  constructor() {
    if (RedisCache.instance) {
      return RedisCache.instance;
    }

    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    this.client.on('error', (err) => Console.red('Redis Error:', err));
    this.client.connect();

    RedisCache.instance = this;
  }

  // Service Status
  async getServiceStatus(): Promise<string> {
    const status = await this.client.get('service:status');
    if (status) return status;

    // Fallback to DB if not cached
    const { getCollectionClient } = await import('../../Database/mongodb.db');
    const { DB_DEFAULT_CONFIGS } = await import('../../Config/key');
    const serviceCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.SERVICE);
    const config = await serviceCollection?.findOne({ SERVICE_NAME: DB_DEFAULT_CONFIGS.DefaultValues.ServiceConfigs.SERVICE_NAME });

    if (config) {
      await this.client.setEx('service:status', 60, config.Service_Status);
      return config.Service_Status;
    }

    return 'inactive';
  }

  // DNS Response Cache
  async getCachedResponse(queryType: string, domain: string): Promise<Buffer | null> {
    const key = `response:${queryType}:${domain}`;
    const cached = await this.client.getBuffer(key);
    return cached;
  }

  async cacheResponse(queryType: string, domain: string, response: Buffer, ttl: number): Promise<void> {
    const key = `response:${queryType}:${domain}`;
    await this.client.setEx(key, ttl, response);
  }

  // Block List
  async isBlocked(domain: string, identifier: string): Promise<boolean> {
    const key = identifier === "global" ? 'block:global' : `block:client:${identifier}`;
    return await this.client.sIsMember(key, domain);
  }

  async addToBlockList(domain: string, identifier: string): Promise<void> {
    const key = identifier === "global" ? 'block:global' : `block:client:${identifier}`;
    await this.client.sAdd(key, domain);
    await this.client.expire(key, 600); // 10 min TTL
  }

  // Rewrites
  async getRewrite(domain: string, identifier: string): Promise<any> {
    const key = identifier === "global"
      ? `rewrite:${domain}:global`
      : `rewrite:${domain}:${identifier}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheRewrite(domain: string, identifier: string, rewrite: any): Promise<void> {
    const key = identifier === "global"
      ? `rewrite:${domain}:global`
      : `rewrite:${domain}:${identifier}`;
    await this.client.setEx(key, 300, JSON.stringify(rewrite));
  }

  // DNS Records
  async getDNSRecord(domain: string): Promise<any> {
    const key = `dns:${domain}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDNSRecord(domain: string, record: any, ttl: number): Promise<void> {
    const key = `dns:${domain}`;
    await this.client.setEx(key, ttl, JSON.stringify(record));
  }

  // User Plans
  async getUserPlan(userId: string): Promise<any> {
    const key = `plan:${userId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheUserPlan(userId: string, plan: any): Promise<void> {
    const key = `plan:${userId}`;
    await this.client.setEx(key, 300, JSON.stringify(plan));
  }

  // Cache invalidation
  async invalidateServiceStatus(): Promise<void> {
    await this.client.del('service:status');
  }

  async invalidateDomain(domain: string): Promise<void> {
    await this.client.del(`dns:${domain}`, `response:A:${domain}`, `response:AAAA:${domain}`);
  }
}
```

---

### 2. Block.service.ts

**Location:** `/Web/src/services/DB/Block.service.ts`

**Purpose:** Check if domain is blocked for specific client or globally

**Implementation:**
```typescript
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";

export class BlockService {
  private blocksCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_BLOCKS);

  async isDomainBlocked(domain: string, clientIP: string): Promise<boolean> {
    if (!this.blocksCollection) return false;

    // Check global blocks
    const globalBlock = await this.blocksCollection.findOne({
      domain: domain,
      enabled: true,
      userId: null,
      $or: [
        { applyToClients: { $size: 0 } },
        { applyToClients: clientIP }
      ]
    });

    if (globalBlock) return true;

    // Check wildcard blocks (*.example.com)
    const wildcardBlock = await this.blocksCollection.findOne({
      blockType: "wildcard",
      enabled: true,
      $or: [
        { applyToClients: { $size: 0 } },
        { applyToClients: clientIP }
      ]
    });

    if (wildcardBlock) {
      const pattern = wildcardBlock.domain.replace('*.', '');
      return domain.endsWith(pattern);
    }

    return false;
  }
}
```

---

### 3. Rewrite.service.ts

**Location:** `/Web/src/services/DB/Rewrite.service.ts`

**Purpose:** Get rewrite rules for domain rerouting

**Implementation:**
```typescript
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";

export class RewriteService {
  private rewritesCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_REWRITES);

  async getRewriteRule(sourceDomain: string, clientIP: string): Promise<any> {
    if (!this.rewritesCollection) return null;

    // Priority: Client-specific → Global
    const rules = await this.rewritesCollection.find({
      sourceDomain: sourceDomain,
      enabled: true,
      $or: [
        { applyToClients: clientIP },
        { applyToClients: { $size: 0 } }
      ]
    }).sort({ priority: 1 }).limit(1).toArray();

    return rules[0] || null;
  }
}
```

---

### 4. UserPlan.service.ts

**Location:** `/Web/src/services/DB/UserPlan.service.ts`

**Purpose:** Validate user subscription plans

**Implementation:**
```typescript
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";
import { ObjectId } from "mongodb";

export class UserPlanService {
  private plansCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.USER_PLANS);

  async getUserPlan(userId: string): Promise<any> {
    if (!this.plansCollection) return null;

    return await this.plansCollection.findOne({
      userId: new ObjectId(userId),
      status: "active"
    });
  }
}
```

---

### 5. QueryLogger.service.ts

**Location:** `/Web/src/services/Logging/QueryLogger.service.ts`

**Purpose:** Batch logging of DNS queries for analytics

**Implementation:**
```typescript
import { DB_DEFAULT_CONFIGS } from "../../Config/key";
import { getCollectionClient } from "../../Database/mongodb.db";

export default class QueryLogger {
  private logsCollection = getCollectionClient(DB_DEFAULT_CONFIGS.Collections.DNS_QUERY_LOGS);
  private batchQueue: any[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Auto-flush every 5 seconds
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  log(logEntry: any): void {
    this.batchQueue.push(logEntry);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batchQueue.length === 0 || !this.logsCollection) return;

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);

    try {
      await this.logsCollection.insertMany(batch, { ordered: false });
    } catch (error) {
      console.error('Failed to insert query logs:', error);
    }
  }
}
```

---

### 6. Optimized Rules.service.ts

**Location:** `/Web/src/services/Start/Rules.service.ts`

**Purpose:** Main DNS query processing with all optimization checks

**Implementation:**
```typescript
import { Console } from "outers";
import InputOutputHandler from "../../utilities/IO.utls";
import dgram from "dgram";
import RedisCache from "../Cache/Redis.service";
import { DomainDBPoolService } from "../DB/DB_Pool.service";
import { RewriteService } from "../DB/Rewrite.service";
import { BlockService } from "../DB/Block.service";
import { UserPlanService } from "../DB/UserPlan.service";
import GlobalDNSforwarder from "../Forwarder/GlobalDNSforwarder.service";
import QueryLogger from "../Logging/QueryLogger.service";

export default class OptimizedRulesService {
  private IO: InputOutputHandler;
  private server: dgram.Socket;
  private redis: RedisCache;
  private queryLogger: QueryLogger;

  constructor(IP_handler: InputOutputHandler, server: dgram.Socket) {
    this.IO = IP_handler;
    this.server = server;
    this.redis = new RedisCache(); // Redis singleton
    this.queryLogger = new QueryLogger();
  }

  public async execute(msg: Buffer, rinfo: dgram.RemoteInfo): Promise<void> {
    const startTime = Date.now();
    const queryName = this.IO.parseQueryName(msg);
    const queryType = this.IO.parseQueryType(msg);
    const clientIP = rinfo.address;

    try {
      // ═══════════════════════════════════════════════════
      // [1] REDIS CACHE CHECK (0.5-1ms)
      // ═══════════════════════════════════════════════════
      const cachedResponse = await this.redis.getCachedResponse(queryType, queryName);
      if (cachedResponse) {
        this.IO.sendRawAnswer(cachedResponse, rinfo);
        this.logQuery(queryName, clientIP, queryType, "cached", Date.now() - startTime);
        return;
      }

      // ═══════════════════════════════════════════════════
      // [2] SERVICE STATUS CHECK (0.5ms - Redis cached)
      // ═══════════════════════════════════════════════════
      const serviceStatus = await this.redis.getServiceStatus();
      if (serviceStatus !== "active") {
        this.sendNXDOMAIN(msg, rinfo, queryName);
        this.logQuery(queryName, clientIP, queryType, "service_inactive", Date.now() - startTime);
        return;
      }

      // ═══════════════════════════════════════════════════
      // [3] BLOCK LIST CHECK (0.5ms - Redis cached)
      // ═══════════════════════════════════════════════════
      const isBlocked = await this.checkBlockList(queryName, clientIP);
      if (isBlocked) {
        this.sendNXDOMAIN(msg, rinfo, queryName);
        this.logQuery(queryName, clientIP, queryType, "blocked", Date.now() - startTime);
        return;
      }

      // ═══════════════════════════════════════════════════
      // [4] REWRITE/REROUTE CHECK (1ms - Redis cached)
      // ═══════════════════════════════════════════════════
      const rewriteRule = await this.checkRewrite(queryName, clientIP);
      if (rewriteRule) {
        const targetRecord = await this.getDNSRecord(rewriteRule.targetDomain);
        if (targetRecord) {
          const response = this.IO.buildSendAnswer(
            msg,
            rinfo,
            queryName,
            targetRecord.value,
            rewriteRule.ttl
          );
          // Cache the response
          await this.redis.cacheResponse(queryType, queryName, response, rewriteRule.ttl);
          this.logQuery(queryName, clientIP, queryType, "rerouted", Date.now() - startTime);
          return;
        }
      }

      // ═══════════════════════════════════════════════════
      // [5] DNS RECORD LOOKUP (2ms - Redis + MongoDB)
      // ═══════════════════════════════════════════════════
      const record = await this.getDNSRecord(queryName);
      if (record) {
        // Check user plan before responding (for custom domains)
        if (record.userId) {
          const hasValidPlan = await this.checkUserPlan(record.userId);
          if (!hasValidPlan) {
            this.sendNXDOMAIN(msg, rinfo, queryName);
            this.logQuery(queryName, clientIP, queryType, "plan_expired", Date.now() - startTime);
            return;
          }
        }

        const response = this.IO.buildSendAnswer(
          msg,
          rinfo,
          queryName,
          record.value,
          record.ttl
        );
        await this.redis.cacheResponse(queryType, queryName, response, record.ttl);
        this.logQuery(queryName, clientIP, queryType, "db", Date.now() - startTime);
        return;
      }

      // ═══════════════════════════════════════════════════
      // [6] UPSTREAM DNS FORWARDING (10-50ms)
      // ═══════════════════════════════════════════════════
      const upstreamResponse = await GlobalDNSforwarder(msg, queryName, 300);
      if (upstreamResponse) {
        this.IO.sendRawAnswer(upstreamResponse, rinfo);
        await this.redis.cacheResponse(queryType, queryName, upstreamResponse, 300);
        this.logQuery(queryName, clientIP, queryType, "upstream", Date.now() - startTime);
      } else {
        this.sendNXDOMAIN(msg, rinfo, queryName);
        this.logQuery(queryName, clientIP, queryType, "nxdomain", Date.now() - startTime);
      }

    } catch (error) {
      Console.red(`Query processing error for ${queryName}:`, error);
      this.sendNXDOMAIN(msg, rinfo, queryName);
      this.logQuery(queryName, clientIP, queryType, "error", Date.now() - startTime);
    }
  }

  // ═══════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════

  private async checkBlockList(domain: string, clientIP: string): Promise<boolean> {
    // Check Redis first
    const globalBlock = await this.redis.isBlocked(domain, "global");
    const clientBlock = await this.redis.isBlocked(domain, clientIP);

    if (globalBlock || clientBlock) return true;

    // If not in cache, check DB and update cache
    const blockService = new BlockService();
    const isBlocked = await blockService.isDomainBlocked(domain, clientIP);

    if (isBlocked) {
      await this.redis.addToBlockList(domain, clientIP || "global");
    }

    return isBlocked;
  }

  private async checkRewrite(domain: string, clientIP: string): Promise<any> {
    // Check Redis cache
    let rewrite = await this.redis.getRewrite(domain, clientIP);
    if (rewrite) return rewrite;

    rewrite = await this.redis.getRewrite(domain, "global");
    if (rewrite) return rewrite;

    // Check DB
    const rewriteService = new RewriteService();
    rewrite = await rewriteService.getRewriteRule(domain, clientIP);

    if (rewrite) {
      await this.redis.cacheRewrite(domain, clientIP || "global", rewrite);
    }

    return rewrite;
  }

  private async getDNSRecord(domain: string): Promise<any> {
    // Check Redis
    const cached = await this.redis.getDNSRecord(domain);
    if (cached) return cached;

    // Check MongoDB
    const record = await new DomainDBPoolService().getDnsRecordByDomainName(domain);

    if (record) {
      await this.redis.cacheDNSRecord(domain, record, record.ttl);
    }

    return record;
  }

  private async checkUserPlan(userId: string): Promise<boolean> {
    // Check Redis
    const cachedPlan = await this.redis.getUserPlan(userId);
    if (cachedPlan) {
      return cachedPlan.status === "active" && new Date(cachedPlan.expiresAt) > Date.now();
    }

    // Check DB
    const userPlanService = new UserPlanService();
    const plan = await userPlanService.getUserPlan(userId);

    if (plan) {
      await this.redis.cacheUserPlan(userId, plan);
      return plan.status === "active" && plan.expiresAt > Date.now();
    }

    return false;
  }

  private sendNXDOMAIN(msg: Buffer, rinfo: dgram.RemoteInfo, domain: string): void {
    this.IO.buildSendAnswer(msg, rinfo, domain, "0.0.0.0", 5);
  }

  private logQuery(
    domain: string,
    clientIP: string,
    queryType: string,
    responseType: string,
    responseTime: number
  ): void {
    // Async logging - don't block response
    setImmediate(() => {
      this.queryLogger.log({
        queryDomain: domain,
        clientIP,
        queryType,
        responseType,
        responseTime,
        timestamp: Date.now()
      });
    });
  }
}
```

---

## 📦 Dependencies

### Web Service Dependencies

```bash
cd Web
npm install redis
npm install @types/redis --save-dev
```

### Server API Dependencies

```bash
cd server
npm install redis
npm install @types/redis --save-dev
```

---

## ⚙️ Configuration

### Environment Variables

Add to `.env`:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password_here

# MongoDB Configuration (existing)
MONGODB_URI=mongodb://localhost:27017/nexoraldns
```

### Database Configuration

Add to `/Web/src/Config/key.ts`:

```typescript
export const DB_DEFAULT_CONFIGS = {
  Collections: {
    SERVICE: "service",
    DOMAINS: "domains",
    DNS_RECORDS: "dns_records",
    DNS_REWRITES: "dns_rewrites",        // NEW
    DNS_BLOCKS: "dns_blocks",            // NEW
    USER_PLANS: "user_plans",            // NEW
    DNS_QUERY_LOGS: "dns_query_logs"     // NEW
  },
  DefaultValues: {
    ServiceConfigs: {
      SERVICE_NAME: "NexoralDNS"
    }
  }
};
```

Add to `/server/source/core/key.ts`:

```typescript
export const DB_DEFAULT_CONFIGS = {
  Collections: {
    SERVICE: "service",
    DOMAINS: "domains",
    DNS_RECORDS: "dns_records",
    DNS_REWRITES: "dns_rewrites",        // NEW
    DNS_BLOCKS: "dns_blocks",            // NEW
    USER_PLANS: "user_plans",            // NEW
    DNS_QUERY_LOGS: "dns_query_logs"     // NEW
  },
  DefaultValues: {
    ServiceConfigs: {
      SERVICE_NAME: "NexoralDNS"
    }
  }
};
```

---

## 🚀 Performance Targets

| Check | Target Latency | Notes |
|-------|---------------|-------|
| Redis Cache Hit | **0.5-1ms** | 80%+ hit rate expected |
| Service Status | **0.5ms** | Cached in Redis |
| Block Check | **0.5ms** | Redis SET lookup |
| Rewrite Check | **1ms** | Redis + fallback DB |
| DNS Record DB | **2-3ms** | Redis + MongoDB |
| User Plan Check | **0.5ms** | Cached in Redis |
| Upstream DNS | **10-50ms** | Only for uncached |
| **Total (Cached)** | **<2ms** | 🎯 Target |
| **Total (Uncached DB)** | **<5ms** | 🎯 Target |
| **Total (Upstream)** | **<50ms** | Acceptable |

---

## 📝 Implementation Checklist

### Phase 1: Redis Setup
- [ ] Install Redis server (`sudo apt install redis-server`)
- [ ] Create `Redis.service.ts` in `/Web/src/services/Cache/`
- [ ] Test Redis connection
- [ ] Configure Redis persistence (AOF + RDB)

### Phase 2: Database Collections
- [ ] Create `DNS_REWRITES` collection
  ```javascript
  db.createCollection("dns_rewrites")
  db.dns_rewrites.createIndex({ sourceDomain: 1, enabled: 1 })
  db.dns_rewrites.createIndex({ userId: 1 })
  ```
- [ ] Create `DNS_BLOCKS` collection
  ```javascript
  db.createCollection("dns_blocks")
  db.dns_blocks.createIndex({ domain: 1, enabled: 1 })
  db.dns_blocks.createIndex({ userId: 1 })
  ```
- [ ] Create `USER_PLANS` collection
  ```javascript
  db.createCollection("user_plans")
  db.user_plans.createIndex({ userId: 1 })
  db.user_plans.createIndex({ status: 1, expiresAt: 1 })
  ```
- [ ] Create `DNS_QUERY_LOGS` collection with TTL
  ```javascript
  db.createCollection("dns_query_logs")
  db.dns_query_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 })
  db.dns_query_logs.createIndex({ userId: 1, timestamp: -1 })
  db.dns_query_logs.createIndex({ clientIP: 1 })
  ```

### Phase 3: Core Services
- [ ] Create `Block.service.ts` in `/Web/src/services/DB/`
- [ ] Create `Rewrite.service.ts` in `/Web/src/services/DB/`
- [ ] Create `UserPlan.service.ts` in `/Web/src/services/DB/`
- [ ] Create `QueryLogger.service.ts` in `/Web/src/services/Logging/`

### Phase 4: Update DNS Query Processing
- [ ] Update `Rules.service.ts` with optimized flow
- [ ] Test each check layer independently
- [ ] Add error handling and fallbacks

### Phase 5: Server API Endpoints
- [ ] Create Rewrite Controller (`/server/source/Controller/Rewrite/`)
  - `POST /api/rewrites` - Create rewrite rule
  - `GET /api/rewrites` - List all rules
  - `GET /api/rewrites/:id` - Get specific rule
  - `PUT /api/rewrites/:id` - Update rule
  - `DELETE /api/rewrites/:id` - Delete rule
- [ ] Create Block Controller (`/server/source/Controller/Block/`)
  - `POST /api/blocks` - Create block rule
  - `GET /api/blocks` - List all blocks
  - `DELETE /api/blocks/:id` - Delete block
- [ ] Create Plan Controller (`/server/source/Controller/Plan/`)
  - `GET /api/plans/:userId` - Get user plan
  - `PUT /api/plans/:userId` - Update user plan
- [ ] Create Analytics endpoint
  - `GET /api/analytics/queries` - Query logs with filters

### Phase 6: Cache Warming
- [ ] Implement cache warming on server startup
- [ ] Preload top 1000 domains from analytics
- [ ] Preload all active rewrites
- [ ] Preload all block lists
- [ ] Preload service status

### Phase 7: Monitoring & Analytics
- [ ] Add metrics for cache hit rate
- [ ] Add latency tracking per query stage
- [ ] Add error rate monitoring
- [ ] Create dashboard for real-time stats

### Phase 8: Testing
- [ ] Unit tests for each service
- [ ] Integration tests for query flow
- [ ] Load testing (1000+ req/s)
- [ ] Failover testing (Redis down, MongoDB down)

---

## 🔍 Monitoring & Metrics

### Key Metrics to Track

1. **Cache Performance**
   - Cache hit rate (target: >80%)
   - Average cache lookup time
   - Redis memory usage

2. **Query Performance**
   - P50, P95, P99 latency
   - Queries per second
   - Error rate

3. **Database Performance**
   - MongoDB query time
   - Connection pool usage
   - Index hit rate

4. **Business Metrics**
   - Most queried domains
   - Blocked queries per hour
   - Rerouted queries per hour
   - User plan utilization

### Recommended Monitoring Tools

- **Prometheus + Grafana** - Metrics visualization
- **Redis Insight** - Redis monitoring
- **MongoDB Compass** - Database monitoring
- **PM2 Monitor** - Process monitoring

---

## 🛡️ Security Considerations

### 1. Redis Security
- Use password authentication
- Bind to localhost only (unless cluster)
- Enable TLS for remote connections
- Regular backup of Redis AOF/RDB

### 2. Rate Limiting
- Implement per-IP query limits
- Block excessive queries from single source
- DDoS protection at network level

### 3. Input Validation
- Validate all domain names
- Sanitize user inputs in API
- Prevent DNS amplification attacks

### 4. Access Control
- User authentication for API endpoints
- Role-based access for admin features
- Audit logs for sensitive operations

---

## 🔄 Cache Invalidation Strategy

### Automatic Invalidation
```typescript
// When DNS record is updated
await redis.invalidateDomain(domain);

// When service status changes
await redis.invalidateServiceStatus();

// When rewrite rule is modified
await redis.del(`rewrite:${sourceDomain}:global`);
await redis.del(`rewrite:${sourceDomain}:${clientIP}`);

// When block rule is modified
await redis.del(`block:global`);
await redis.del(`block:client:${clientIP}`);
```

### Manual Cache Clear
```bash
# Clear all caches
redis-cli FLUSHDB

# Clear specific domain
redis-cli DEL "dns:google.com" "response:A:google.com"

# Clear all DNS responses
redis-cli --scan --pattern "response:*" | xargs redis-cli DEL
```

---

## 🚦 High Availability Setup

### Redis Cluster
```bash
# Master-Replica setup for failover
redis-server --port 6379 --replicaof no one  # Master
redis-server --port 6380 --replicaof localhost 6379  # Replica
```

### MongoDB Replica Set
```javascript
rs.initiate({
  _id: "nexoral-rs",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "localhost:27018" },
    { _id: 2, host: "localhost:27019" }
  ]
})
```

### DNS Service Clustering
- Use PM2 cluster mode
- Load balance across multiple instances
- Shared Redis cache across all workers

---

## 📚 API Documentation

### Rewrite Endpoints

#### Create Rewrite Rule
```http
POST /api/rewrites
Authorization: Bearer <token>
Content-Type: application/json

{
  "sourceDomain": "google.com",
  "targetDomain": "ankan.site",
  "applyToClients": ["192.168.1.5"],  // Empty for global
  "ttl": 300,
  "priority": 10
}
```

#### List Rewrites
```http
GET /api/rewrites?userId=<userId>
Authorization: Bearer <token>
```

#### Update Rewrite
```http
PUT /api/rewrites/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": false
}
```

#### Delete Rewrite
```http
DELETE /api/rewrites/:id
Authorization: Bearer <token>
```

### Block Endpoints

#### Create Block Rule
```http
POST /api/blocks
Authorization: Bearer <token>
Content-Type: application/json

{
  "domain": "ads.google.com",
  "blockType": "exact",
  "applyToClients": [],
  "reason": "Ads"
}
```

#### List Blocks
```http
GET /api/blocks?userId=<userId>
Authorization: Bearer <token>
```

### Analytics Endpoints

#### Query Logs
```http
GET /api/analytics/queries?startDate=2024-01-01&endDate=2024-01-31&clientIP=192.168.1.5
Authorization: Bearer <token>
```

Response:
```json
{
  "totalQueries": 150000,
  "cachedQueries": 120000,
  "upstreamQueries": 25000,
  "blockedQueries": 5000,
  "averageResponseTime": 2.3,
  "topDomains": [
    { "domain": "google.com", "count": 5000 },
    { "domain": "facebook.com", "count": 3000 }
  ]
}
```

---

## 🔞 Anti-Porn Mode Feature

### Overview

NexoralDNS includes a built-in **Anti-Porn Mode** feature that provides easy-to-use adult content filtering at the DNS level. This feature automatically blocks access to 100+ known adult content websites and can be enabled for specific users, IP groups, or globally across your entire network.

### Key Features

1. **Pre-configured Domain List**: Includes 100+ adult content domains (automatically maintained)
2. **Flexible Targeting**: Block for specific IPs, IP groups, or all users
3. **Easy Management**: Simple UI for enabling/disabling policies
4. **Real-time Updates**: Changes take effect within seconds via Redis cache invalidation
5. **No Performance Impact**: Uses the existing high-performance ACL system

### Architecture

#### Server Components

**1. Domain Group (Adult Content)**
- **Location**: Auto-seeded at server startup
- **Collection**: `domain_groups`
- **Name**: `"Adult Content (Anti-Porn)"`
- **Marker**: `isSystemGroup: true`
- **Domains**: 100+ adult content sites with wildcard support
- **Update**: Automatically created/updated on server restart

**2. AntiPornMode Service**
- **Location**: `/server/source/Services/AntiPornMode/AntiPornMode.service.ts`
- **Purpose**: High-level API for managing anti-porn policies
- **Key Methods**:
  - `enableAntiPornMode(params)` - Create blocking policy
  - `disableAntiPornMode(policyId)` - Delete policy
  - `toggleAntiPornMode(policyId)` - Toggle active status
  - `getAntiPornModeStatus(filter)` - Get all anti-porn policies
  - `isEnabledForIP(ip)` - Check if enabled for specific IP

**3. AntiPornMode Controller**
- **Location**: `/server/source/Controller/AntiPornMode/AntiPornMode.controller.ts`
- **Routes**: Registered at `/api/anti-porn-mode`
- **Features**:
  - Request deduplication
  - Redis cache invalidation after changes
  - Proper error handling and validation

#### Client Components

**1. AntiPornPolicyModal**
- **Location**: `/client/components/anti-porn-mode/AntiPornPolicyModal.jsx`
- **Purpose**: User-friendly modal for enabling anti-porn mode
- **Features**:
  - 2-step wizard (Target Selection → Details)
  - Support for all target types (single IP, multiple IPs, IP groups, all users)
  - Auto-generated policy names
  - Real-time validation

**2. AntiPornModeSection**
- **Location**: `/client/components/anti-porn-mode/AntiPornModeSection.jsx`
- **Purpose**: Dashboard view for managing anti-porn policies
- **Features**:
  - Grid view of all policies
  - Toggle switches for quick enable/disable
  - Delete policies with confirmation
  - Filter by status (all/active/inactive)

**3. Integration**
- **Location**: `/client/app/dashboard/access-control/page.js`
- **Tab**: "Anti-Porn Mode" (first tab with 🔞 icon)
- **Navigation**: Dashboard → Access Control → Anti-Porn Mode

### API Endpoints

```typescript
// Enable anti-porn mode
POST /api/anti-porn-mode/enable
Body: {
  targetType: 'single_ip' | 'multiple_ips' | 'ip_group' | 'multiple_ip_groups' | 'all',
  targetIP?: string,
  targetIPs?: string[],
  targetIPGroup?: string,
  targetIPGroups?: string[],
  policyName?: string
}

// Disable anti-porn mode
DELETE /api/anti-porn-mode/:policyId

// Toggle anti-porn policy status
PATCH /api/anti-porn-mode/:policyId/toggle

// Get anti-porn mode status
GET /api/anti-porn-mode/status?filter=all|active|inactive

// Check if enabled for specific IP
GET /api/anti-porn-mode/check-ip/:ip
```

### Usage Examples

#### Enable for All Users (Globally)

```bash
curl -X POST http://localhost:4773/api/anti-porn-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "all",
    "policyName": "Global Anti-Porn Policy"
  }'
```

#### Enable for Specific Device

```bash
curl -X POST http://localhost:4773/api/anti-porn-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "single_ip",
    "targetIP": "192.168.1.100",
    "policyName": "Kids Device Anti-Porn"
  }'
```

#### Enable for IP Group (e.g., "Kids Devices")

```bash
curl -X POST http://localhost:4773/api/anti-porn-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "ip_group",
    "targetIPGroup": "507f1f77bcf86cd799439011",
    "policyName": "Kids Group Anti-Porn"
  }'
```

### How It Works

1. **Initialization**: On server startup, the adult content domain group is automatically created/updated
2. **Policy Creation**: When user enables anti-porn mode, a policy is created linking the target (IP/group/all) to the adult content domain group
3. **DNS Resolution**: When a DNS query arrives:
   - BlockList service checks if the domain is in any active policy
   - Adult content domains are matched (with wildcard support)
   - If blocked, returns `0.0.0.0` (NXDOMAIN)
   - If allowed, continues normal resolution
4. **Cache Invalidation**: Policy changes trigger Redis pub/sub events to clear BlockList caches across all workers
5. **Immediate Effect**: Changes take effect within seconds (next cron cycle or cache expiry)

### Blocked Content Categories

The anti-porn mode blocks the following categories:

1. **Major Adult Sites**: Pornhub, xVideos, xHamster, etc. (20+ sites)
2. **Live Cam Sites**: Chaturbate, LiveJasmin, Stripchat, etc. (10+ sites)
3. **Hentai/Anime Adult Content**: hentai.com, nhentai, hanime, etc. (5+ sites)
4. **Adult Dating/Hookup Sites**: AdultFriendFinder, Ashley Madison, etc.
5. **CDN & Ad Networks**: Adult content delivery networks and ad platforms
6. **Alternative TLDs**: Common misspellings and alternative domains

Total: **100+ domains** with wildcard support for subdomains

### Performance

- **Overhead**: Negligible (<0.1ms) - uses existing ACL system
- **Cache Hit Rate**: 95%+ due to multi-layer caching
- **Scalability**: Handles 10,000+ req/s with no degradation
- **Update Latency**: Changes propagate within 3-5 seconds

### Management UI

The anti-porn mode can be managed through the web interface:

1. Navigate to **Dashboard → Access Control → Anti-Porn Mode**
2. Click **"Enable Anti-Porn Mode"** button
3. Select target type (who to block)
4. Configure details (IP, groups, or global)
5. Click **"Enable Anti-Porn Mode"**

Policies can be toggled on/off or deleted at any time.

### Database Schema

Anti-porn policies are stored as standard access control policies:

```typescript
{
  _id: ObjectId,
  policyType: "domain_user",
  targetType: "all" | "single_ip" | "multiple_ips" | "ip_group" | "multiple_ip_groups",
  targetIP?: string,
  targetIPs?: string[],
  targetIPGroup?: ObjectId,
  targetIPGroups?: ObjectId[],
  blockType: "domain_group",
  domainGroup: ObjectId, // References adult content domain group
  policyName: string,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}
```

### Maintenance

**Adding New Domains**:
1. Edit `/server/source/Constants/AdultContentDomains.constant.ts`
2. Add domains to `ADULT_CONTENT_DOMAINS` array
3. Restart server to auto-update the domain group

**Checking Status**:
```bash
# Check if adult content group exists
mongo nexoral_db --eval "db.domain_groups.findOne({ isSystemGroup: true, name: 'Adult Content (Anti-Porn)' })"

# List all anti-porn policies
curl -X GET http://localhost:4773/api/anti-porn-mode/status?filter=active \
  -H "Authorization: Bearer <token>"
```

**Troubleshooting**:
- If policies don't take effect, check Redis: `redis-cli keys "acl:*"`
- Force reload: Trigger cache invalidation via policy update
- Check logs: Look for `[Anti-Porn]` prefix in server logs

---

## 🛡️ Anti-Ads Mode Feature

### Overview

NexoralDNS includes a built-in **Anti-Ads Mode** feature that provides comprehensive ad blocking and tracking prevention at the DNS level. This feature automatically blocks access to 200+ advertising and tracking domains including Google Ads, Facebook tracking, Amazon ads, and more. It can be enabled for specific users, IP groups, or globally across your entire network.

### Key Features

1. **Comprehensive Domain List**: Includes 200+ advertising and tracking domains based on Hagezi, AdGuard, and EasyList (2026)
2. **Flexible Targeting**: Block for specific IPs, IP groups, or all users
3. **Easy Management**: Simple UI for enabling/disabling policies
4. **Real-time Updates**: Changes take effect within seconds via Redis cache invalidation
5. **No Performance Impact**: Uses the existing high-performance ACL system
6. **Statistics**: Blocks approximately 20% of typical web traffic identified as advertising/tracking

### Architecture

#### Server Components

**1. Domain Group (Ad Blocking)**
- **Location**: Auto-seeded at server startup
- **Collection**: `domain_groups`
- **Name**: `"Ads & Trackers (Anti-Ads)"`
- **Marker**: `isSystemGroup: true`
- **Domains**: 200+ advertising and tracking domains with wildcard support
- **Update**: Automatically created/updated on server restart
- **Sources**: Hagezi DNS Blocklists, AdGuard DNS Filter, EasyList, Privacy Web Almanac 2025

**2. AntiAdsMode Service**
- **Location**: `/server/source/Services/AntiAdsMode/AntiAdsMode.service.ts`
- **Purpose**: High-level API for managing anti-ads policies
- **Security**: Input validation, NoSQL injection prevention, error sanitization
- **Key Methods**:
  - `enableAntiAdsMode(params)` - Create blocking policy
  - `disableAntiAdsMode(policyId)` - Delete policy
  - `toggleAntiAdsMode(policyId)` - Toggle active status
  - `getAntiAdsModeStatus(filter)` - Get all anti-ads policies
  - `isEnabledForIP(ip)` - Check if enabled for specific IP

**3. AntiAdsMode Controller**
- **Location**: `/server/source/Controller/AntiAdsMode/AntiAdsMode.controller.ts`
- **Routes**: Registered at `/api/anti-ads-mode`
- **Features**:
  - Request deduplication
  - Redis cache invalidation after changes
  - Comprehensive input validation
  - Proper error handling

#### Client Components

**1. AntiAdsPolicyModal**
- **Location**: `/client/components/anti-ads-mode/AntiAdsPolicyModal.jsx`
- **Purpose**: User-friendly modal for enabling anti-ads mode
- **Features**:
  - 2-step wizard (Target Selection → Details)
  - Support for all target types (single IP, multiple IPs, IP groups, all users)
  - Auto-generated policy names
  - Real-time validation
  - Domain statistics display

**2. AntiAdsModeSection**
- **Location**: `/client/components/anti-ads-mode/AntiAdsModeSection.jsx`
- **Purpose**: Dashboard view for managing anti-ads policies
- **Features**:
  - Grid view of all policies
  - Toggle switches for quick enable/disable
  - Delete policies with confirmation
  - Filter by status (all/active/inactive)
  - Domain blocking statistics

**3. Integration**
- **Location**: `/client/app/dashboard/access-control/page.js`
- **Tab**: "Anti-Ads Mode" (second tab with 🛡️ icon)
- **Navigation**: Dashboard → Access Control → Anti-Ads Mode

### API Endpoints

```typescript
// Enable anti-ads mode
POST /api/anti-ads-mode/enable
Body: {
  targetType: 'single_ip' | 'multiple_ips' | 'ip_group' | 'multiple_ip_groups' | 'all',
  targetIP?: string,
  targetIPs?: string[],
  targetIPGroup?: string,
  targetIPGroups?: string[],
  policyName?: string
}

// Disable anti-ads mode
DELETE /api/anti-ads-mode/:policyId

// Toggle anti-ads policy status
PATCH /api/anti-ads-mode/:policyId/toggle

// Get anti-ads mode status
GET /api/anti-ads-mode/status?filter=all|active|inactive

// Check if enabled for specific IP
GET /api/anti-ads-mode/check-ip/:ip
```

### Usage Examples

#### Enable for All Users (Globally)

```bash
curl -X POST http://localhost:4773/api/anti-ads-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "all",
    "policyName": "Global Ad Blocking Policy"
  }'
```

#### Enable for Specific Device

```bash
curl -X POST http://localhost:4773/api/anti-ads-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "single_ip",
    "targetIP": "192.168.1.100",
    "policyName": "Device Ad Blocking"
  }'
```

#### Enable for IP Group (e.g., "Kids Devices")

```bash
curl -X POST http://localhost:4773/api/anti-ads-mode/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "ip_group",
    "targetIPGroup": "507f1f77bcf86cd799439011",
    "policyName": "Kids Group Ad Blocking"
  }'
```

### How It Works

1. **Initialization**: On server startup, the ad blocking domain group is automatically created/updated from a comprehensive list
2. **Policy Creation**: When user enables anti-ads mode, a policy is created linking the target (IP/group/all) to the ad blocking domain group
3. **DNS Resolution**: When a DNS query arrives:
   - BlockList service checks if the domain is in any active policy
   - Advertising/tracking domains are matched (with wildcard support)
   - If blocked, returns `0.0.0.0` (NXDOMAIN)
   - If allowed, continues normal resolution
4. **Cache Invalidation**: Policy changes trigger Redis pub/sub events to clear BlockList caches across all workers
5. **Immediate Effect**: Changes take effect within seconds (next cron cycle or cache expiry)

### Blocked Content Categories

The anti-ads mode blocks the following categories:

1. **Google Advertising & Analytics** (20+ domains)
   - DoubleClick, AdSense, GoogleAdServices, GoogleTagManager, Google Analytics

2. **Facebook / Meta Advertising & Tracking** (10+ domains)
   - Facebook Pixel, Connect, Analytics, Graph API

3. **Major Ad Networks & Exchanges** (50+ domains)
   - Amazon Advertising, Microsoft Bing Ads, Yahoo Ads, AppNexus, Criteo, Outbrain, Taboola

4. **Analytics & Tracking Services** (30+ domains)
   - Adobe Analytics, Hotjar, Mixpanel, Segment, Quantcast, Comscore, Nielsen, Chartbeat

5. **Social Media Tracking** (10+ domains)
   - Twitter/X Ads, LinkedIn Tracking, Pinterest Tracking, Reddit Tracking, TikTok Pixel

6. **Mobile Ad Networks** (15+ domains)
   - AdMob, InMobi, Unity Ads, Vungle, IronSource

7. **Video Ad Platforms** (10+ domains)
   - SpotX, FreeWheel, Brightcove Ads

8. **Retargeting & Remarketing** (10+ domains)
   - AdRoll, Perfect Audience, Retargetly

9. **Affiliate & Conversion Tracking** (10+ domains)
   - Commission Junction, ShareASale, Rakuten Advertising, Impact

10. **Pop-ups & Aggressive Ads** (10+ domains)
    - PopAds, PropellerAds, AdCash, PopCash

11. **Ad CDN & Infrastructure** (15+ domains)
    - Various ad content delivery networks and infrastructure

Total: **200+ domains** with wildcard support for subdomains

### Statistics

Based on 2026 research:
- **Google Analytics**: Appears on 44% of websites
- **DoubleClick**: Appears on 32% of websites
- **Facebook tracking**: Appears on 22% of websites
- **Ad/tracking traffic**: Comprises ~20% of all web traffic
- **Blocked requests**: Typically reduces ad traffic by 15-25% depending on browsing habits

### Performance

- **Overhead**: Negligible (<0.1ms) - uses existing ACL system
- **Cache Hit Rate**: 95%+ due to multi-layer caching
- **Scalability**: Handles 10,000+ req/s with no degradation
- **Update Latency**: Changes propagate within 3-5 seconds
- **Memory Impact**: Minimal - domain list pre-loaded at startup

### Management UI

The anti-ads mode can be managed through the web interface:

1. Navigate to **Dashboard → Access Control → Anti-Ads Mode**
2. Click **"Enable Anti-Ads Mode"** button
3. Select target type (who to block)
4. Configure details (IP, groups, or global)
5. Click **"Enable Anti-Ads Mode"**

Policies can be toggled on/off or deleted at any time.

### Database Schema

Anti-ads policies are stored as standard access control policies:

```typescript
{
  _id: ObjectId,
  policyType: "domain_user",
  targetType: "all" | "single_ip" | "multiple_ips" | "ip_group" | "multiple_ip_groups",
  targetIP?: string,
  targetIPs?: string[],
  targetIPGroup?: ObjectId,
  targetIPGroups?: ObjectId[],
  blockType: "domain_group",
  domainGroup: ObjectId, // References ad blocking domain group
  policyName: string,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}
```

### Maintenance

**Adding New Domains**:
1. Edit `/server/source/Constants/AdBlockingDomains.constant.ts`
2. Add domains to `AD_BLOCKING_DOMAINS` array
3. Update `lastUpdated` and `version` in metadata
4. Restart server to auto-update the domain group

**Checking Status**:
```bash
# Check if ad blocking group exists
mongo nexoral_db --eval "db.domain_groups.findOne({ isSystemGroup: true, name: 'Ads & Trackers (Anti-Ads)' })"

# List all anti-ads policies
curl -X GET http://localhost:4773/api/anti-ads-mode/status?filter=active \
  -H "Authorization: Bearer <token>"

# Check domain count
curl -X GET http://localhost:4773/api/anti-ads-mode/status \
  -H "Authorization: Bearer <token>"
```

**Troubleshooting**:
- If policies don't take effect, check Redis: `redis-cli keys "acl:*"`
- Force reload: Trigger cache invalidation via policy update
- Check logs: Look for `[Anti-Ads]` prefix in server logs
- Verify domain group: Check `domain_groups` collection for ad blocking group

### Security Considerations

The anti-ads mode implementation follows security best practices:

1. **Input Validation**: All inputs validated before processing
2. **NoSQL Injection Prevention**: Safe ObjectId conversion and query construction
3. **XSS Prevention**: Policy names sanitized to remove dangerous characters
4. **DoS Protection**: Array size limits (100 IPs, 50 groups)
5. **Error Sanitization**: No internal details exposed to clients
6. **Authentication Required**: All endpoints require valid JWT token

### Comparison with Anti-Porn Mode

| Feature | Anti-Porn Mode | Anti-Ads Mode |
|---------|----------------|---------------|
| **Domain Count** | 100+ adult content sites | 200+ ad/tracking domains |
| **Purpose** | Block adult content | Block ads and tracking |
| **Categories** | Adult sites, cam sites, hookup apps | Ads, analytics, trackers, social media pixels |
| **Traffic Reduction** | Minimal (~1% of traffic) | Significant (~20% of traffic) |
| **Use Case** | Parental controls, workplace safety | Privacy, faster browsing, bandwidth saving |
| **Update Frequency** | Quarterly | Monthly (follows adtech changes) |
| **Sources** | Manual curation | Hagezi, AdGuard, EasyList |

---

## 🧪 Testing

### Unit Tests Example
```typescript
// Redis.service.test.ts
import RedisCache from '../services/Cache/Redis.service';

describe('RedisCache', () => {
  let redis: RedisCache;

  beforeAll(() => {
    redis = new RedisCache();
  });

  it('should cache and retrieve DNS response', async () => {
    const domain = 'test.com';
    const response = Buffer.from('test');

    await redis.cacheResponse('A', domain, response, 300);
    const cached = await redis.getCachedResponse('A', domain);

    expect(cached).toEqual(response);
  });
});
```

### Load Testing
```bash
# Using dnsperf
dnsperf -d queries.txt -s 127.0.0.1 -c 100 -l 60

# Using custom script
node scripts/load-test.js --queries=10000 --concurrent=100
```

---

## 🎯 Future Optimizations

1. **DNSSEC Support** - Add DNS security extensions
2. **IPv6 Support** - Full AAAA record support
3. **Geo-based Routing** - Return different IPs based on client location
4. **ML-based Query Prediction** - Preload likely queries
5. **GraphQL API** - Modern API for frontend
6. **Webhook Integration** - Real-time notifications for events
7. **Multi-Region Deployment** - Global DNS service

---

## 📞 Support & Maintenance

### Log Locations
- DNS Service: `/var/log/nexoraldns/dns.log`
- Server API: `/var/log/nexoraldns/api.log`
- Redis: `/var/log/redis/redis-server.log`
- MongoDB: `/var/log/mongodb/mongod.log`

### Common Issues

**High Redis Memory Usage**
```bash
# Check memory stats
redis-cli INFO memory

# Clear old keys
redis-cli --scan --pattern "response:*" | head -n 1000 | xargs redis-cli DEL
```

**Slow MongoDB Queries**
```javascript
// Check slow queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

**DNS Service Not Responding**
```bash
# Check if port 53 is listening
sudo netstat -tulpn | grep :53

# Restart service
pm2 restart dns-service

# Check logs
pm2 logs dns-service --lines 100
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- **Ankan Saha** - Initial architecture and implementation

---

**Last Updated:** 2026-02-16
**Version:** 3.3.42-stable
