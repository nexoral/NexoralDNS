# Access Control Policies - Complete Implementation Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema Design](#2-database-schema-design)
3. [High-Performance Matching Algorithms](#3-high-performance-matching-algorithms)
4. [Implementation Strategy](#4-implementation-strategy)
5. [Code Examples](#5-code-examples)
6. [Performance Optimization](#6-performance-optimization)
7. [Testing Strategy](#7-testing-strategy)

---

## 1. Architecture Overview

### 1.1 System Flow

```
DNS Query (example.com from 192.168.1.100)
    ↓
[1. Service Status Check] ← 10ms
    ↓
[2. Policy Engine] ← 2-5ms (CRITICAL PATH)
    ├─ Check if IP has full internet block
    ├─ Check if domain is blocked for this IP
    ├─ Check if domain is blocked for all users
    └─ Check domain group matches
    ↓
[3. Cache Lookup] ← 1-2ms
    ↓
[4. Database Lookup] ← 3-5ms
    ↓
[5. Upstream Forward] ← 30-50ms
```

### 1.2 Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           Layer 1: In-Memory Cache              │
│  (Radix Tree + Hash Map for <1ms lookups)      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│           Layer 2: Redis Cache                  │
│  (Hot policies, TTL: 5 minutes)                 │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│           Layer 3: MongoDB Storage              │
│  (Persistent policy database)                   │
└─────────────────────────────────────────────────┘
```

**Performance Targets:**
- **In-Memory Hit:** <1ms (95% of queries)
- **Redis Hit:** <2ms (4% of queries)
- **MongoDB Hit:** <5ms (1% of queries, cache miss)

---

## 2. Database Schema Design

### 2.1 MongoDB Collections

#### Collection: `policies`

```javascript
{
  _id: ObjectId("..."),

  // Basic Info
  name: "Block Social Media for Kids",
  description: "Blocks Facebook, Instagram, TikTok for kids' devices",
  isEnabled: true,
  priority: 100,  // Higher = checked first (1-1000)

  // Policy Type (determines matching logic)
  policyType: "user_to_domain",
  // Options: "user_to_domain", "user_to_internet", "domain_to_all", "time_based"

  // Source Configuration (WHO is affected)
  source: {
    type: "ip_group",  // "single_ip", "ip_group", "all_users"
    value: ObjectId("..."),  // Reference to ip_groups collection

    // For single_ip type:
    // value: "192.168.1.100"

    // For all_users type:
    // value: null
  },

  // Target Configuration (WHAT is blocked)
  target: {
    type: "domain_group",  // "single_domain", "domain_group", "full_internet", "regex"
    value: ObjectId("..."),  // Reference to domain_groups collection

    // For single_domain type:
    // value: "facebook.com"

    // For full_internet type:
    // value: null

    // For regex type:
    // value: ".*\\.facebook\\.com$"
  },

  // Action to take when matched
  action: "block",  // "block", "allow", "redirect"

  // Redirect configuration (if action = "redirect")
  redirect: {
    type: "custom_ip",  // "custom_ip", "safe_search"
    value: "192.168.1.50"  // IP to redirect to
  },

  // Schedule (optional - for time-based policies)
  schedule: {
    enabled: true,
    timezone: "Asia/Kolkata",
    rules: [
      {
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],  // School days
        startTime: "21:00",  // Block from 9 PM
        endTime: "07:00"     // Until 7 AM
      },
      {
        days: ["saturday", "sunday"],  // Weekends
        startTime: "23:00",
        endTime: "08:00"
      }
    ]
  },

  // Metadata
  createdBy: ObjectId("..."),  // User who created
  createdAt: ISODate("2025-12-16T10:00:00Z"),
  updatedAt: ISODate("2025-12-16T10:00:00Z"),

  // Statistics
  stats: {
    totalBlocks: 15420,
    lastBlockedAt: ISODate("2025-12-16T14:30:00Z")
  }
}
```

**Indexes:**
```javascript
db.policies.createIndex({ isEnabled: 1, priority: -1 })  // Fast enabled policy lookup
db.policies.createIndex({ "source.type": 1, "source.value": 1 })  // IP-based lookup
db.policies.createIndex({ "target.type": 1, "target.value": 1 })  // Domain-based lookup
db.policies.createIndex({ createdAt: -1 })  // Sorting by date
```

---

#### Collection: `domain_groups`

```javascript
{
  _id: ObjectId("..."),

  // Basic Info
  name: "Social Media",
  description: "Popular social networking sites",
  category: "social",  // "social", "streaming", "gaming", "ads", "malware", "custom"
  icon: "users",  // For UI display
  color: "#3B82F6",  // For UI display

  // Domains (stored as normalized format)
  domains: [
    {
      domain: "facebook.com",
      type: "exact",  // "exact", "wildcard", "regex"
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      domain: "*.facebook.com",
      type: "wildcard",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      domain: "instagram.com",
      type: "exact",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      domain: "tiktok.com",
      type: "exact",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    }
  ],

  // Blocklist Integration (optional)
  blocklist: {
    enabled: false,
    source: "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    lastSynced: ISODate("2025-12-16T00:00:00Z"),
    syncInterval: 86400  // 24 hours in seconds
  },

  // Metadata
  isSystem: false,  // System-created groups can't be deleted
  createdBy: ObjectId("..."),
  createdAt: ISODate("2025-12-16T10:00:00Z"),
  updatedAt: ISODate("2025-12-16T10:00:00Z"),

  // Statistics
  stats: {
    totalDomains: 3,
    totalBlocks: 5230,
    lastUsed: ISODate("2025-12-16T14:30:00Z")
  }
}
```

**Indexes:**
```javascript
db.domain_groups.createIndex({ name: 1 }, { unique: true })
db.domain_groups.createIndex({ category: 1 })
db.domain_groups.createIndex({ "domains.domain": 1 })  // Fast domain lookup
```

---

#### Collection: `ip_groups`

```javascript
{
  _id: ObjectId("..."),

  // Basic Info
  name: "Kids Devices",
  description: "Children's tablets and phones",
  icon: "users",
  color: "#10B981",

  // IP Addresses
  ips: [
    {
      ip: "192.168.1.100",
      type: "single",  // "single", "range", "cidr"
      label: "John's iPad",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      ip: "192.168.1.101",
      type: "single",
      label: "Sarah's Phone",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      ip: "192.168.1.110-192.168.1.120",
      type: "range",
      label: "Guest WiFi Range",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    },
    {
      ip: "192.168.2.0/24",
      type: "cidr",
      label: "IoT Network",
      enabled: true,
      addedAt: ISODate("2025-12-16T10:00:00Z")
    }
  ],

  // DHCP Integration (auto-discovery)
  dhcp: {
    enabled: true,
    autoAdd: false,  // Automatically add new devices from DHCP
    filter: "192.168.1.*"  // Only auto-add from this subnet
  },

  // Metadata
  isSystem: false,
  createdBy: ObjectId("..."),
  createdAt: ISODate("2025-12-16T10:00:00Z"),
  updatedAt: ISODate("2025-12-16T10:00:00Z"),

  // Statistics
  stats: {
    totalIPs: 4,
    totalBlocks: 1240,
    lastUsed: ISODate("2025-12-16T14:30:00Z")
  }
}
```

**Indexes:**
```javascript
db.ip_groups.createIndex({ name: 1 }, { unique: true })
db.ip_groups.createIndex({ "ips.ip": 1 })  // Fast IP lookup
```

---

#### Collection: `policy_logs` (Analytics)

```javascript
{
  _id: ObjectId("..."),

  // Policy Info
  policyId: ObjectId("..."),
  policyName: "Block Social Media for Kids",

  // Query Info
  domain: "facebook.com",
  clientIP: "192.168.1.100",
  action: "blocked",  // "blocked", "allowed", "redirected"

  // Performance
  matchTime: 0.8,  // Milliseconds to match policy

  // Timestamp
  timestamp: ISODate("2025-12-16T14:30:15Z"),

  // TTL (auto-delete after 30 days)
  expireAt: ISODate("2025-01-15T14:30:15Z")
}
```

**Indexes:**
```javascript
db.policy_logs.createIndex({ timestamp: -1 })
db.policy_logs.createIndex({ policyId: 1, timestamp: -1 })
db.policy_logs.createIndex({ clientIP: 1, timestamp: -1 })
db.policy_logs.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })  // TTL index
```

---

### 2.2 Redis Cache Structure

#### Key Structure for Fast Lookups

```javascript
// 1. Full Internet Block for IP (fastest check - O(1))
Key: "policy:internet_block:192.168.1.100"
Value: "true"
TTL: 300 seconds (5 minutes)

// 2. Exact Domain Block for IP (O(1))
Key: "policy:ip:192.168.1.100:domain:facebook.com"
Value: JSON.stringify({
  action: "block",
  policyId: "...",
  priority: 100
})
TTL: 300 seconds

// 3. Domain Block for ALL Users (O(1))
Key: "policy:all:domain:facebook.com"
Value: JSON.stringify({
  action: "block",
  policyId: "...",
  priority: 50
})
TTL: 300 seconds

// 4. Domain Group Membership (O(1))
Key: "domain_group:social_media"
Value: JSON.stringify([
  "facebook.com",
  "instagram.com",
  "tiktok.com"
])
TTL: 600 seconds (10 minutes)

// 5. IP Group Membership (O(1))
Key: "ip_group:kids_devices"
Value: JSON.stringify([
  "192.168.1.100",
  "192.168.1.101"
])
TTL: 600 seconds

// 6. Wildcard Domain Patterns (for Radix Tree reload)
Key: "policy:wildcards"
Value: JSON.stringify([
  "*.facebook.com",
  "*.instagram.com"
])
TTL: 600 seconds

// 7. Active Policies Hash (quick reload)
Key: "policy:active_list"
Value: JSON.stringify({
  policies: [...],  // All enabled policies
  lastUpdated: 1702734615000
})
TTL: 300 seconds
```

---

## 3. High-Performance Matching Algorithms

### 3.1 Algorithm Selection by Use Case

| Use Case | Algorithm | Time Complexity | Memory | Best For |
|----------|-----------|----------------|--------|----------|
| Exact domain match | **Hash Map** | O(1) | Low | `facebook.com` |
| Wildcard domain | **Radix Tree** | O(k)* | Medium | `*.facebook.com` |
| Regex domain | **Regex Engine** | O(n*m) | Low | `.*\\.ad.*\\.com$` |
| IP exact match | **Hash Map** | O(1) | Low | `192.168.1.100` |
| IP range match | **IP Range Tree** | O(log n) | Medium | `192.168.1.0/24` |
| Blocklist (1M+ domains) | **Bloom Filter** | O(k) | Very Low | Negative checks |

*k = length of domain name

### 3.2 Layered Matching Strategy (Fastest → Slowest)

```typescript
async function checkPolicy(domain: string, clientIP: string): Promise<PolicyResult> {
  // LAYER 1: Check full internet block (fastest - O(1))
  if (await redis.exists(`policy:internet_block:${clientIP}`)) {
    return { action: "block", reason: "Full internet blocked for IP", matchTime: 0.1 };
  }

  // LAYER 2: Check exact domain + IP match (O(1))
  const exactMatch = await redis.get(`policy:ip:${clientIP}:domain:${domain}`);
  if (exactMatch) {
    return { action: JSON.parse(exactMatch).action, reason: "Exact IP+Domain match", matchTime: 0.3 };
  }

  // LAYER 3: Check domain blocked for ALL users (O(1))
  const allUsersMatch = await redis.get(`policy:all:domain:${domain}`);
  if (allUsersMatch) {
    return { action: JSON.parse(allUsersMatch).action, reason: "Domain blocked for all", matchTime: 0.5 };
  }

  // LAYER 4: Check wildcard domain match using Radix Tree (O(k))
  const wildcardMatch = await checkWildcardMatch(domain, clientIP);
  if (wildcardMatch) {
    return { action: wildcardMatch.action, reason: "Wildcard match", matchTime: 1.2 };
  }

  // LAYER 5: Check domain groups (O(1) hash + O(n) array scan)
  const groupMatch = await checkDomainGroupMatch(domain, clientIP);
  if (groupMatch) {
    return { action: groupMatch.action, reason: "Domain group match", matchTime: 2.0 };
  }

  // LAYER 6: Check regex patterns (slowest - O(n*m))
  const regexMatch = await checkRegexMatch(domain, clientIP);
  if (regexMatch) {
    return { action: regexMatch.action, reason: "Regex match", matchTime: 3.5 };
  }

  // NO MATCH - Allow
  return { action: "allow", reason: "No policy match", matchTime: 0.1 };
}
```

### 3.3 Radix Tree Implementation for Wildcards

**Why Radix Tree?**
- Handles wildcard domains efficiently: `*.facebook.com` matches `www.facebook.com`, `m.facebook.com`, etc.
- Memory efficient: Shared prefixes compressed
- Fast lookups: O(k) where k = domain length

**Example Structure:**

```
Domain: www.facebook.com
Reverse: com.facebook.www (stored reversed for suffix matching)

Radix Tree:
    com
    └── facebook
        ├── * (wildcard - matches ALL)
        ├── www
        ├── m
        └── mobile
```

**Code Example:**

```typescript
import Radix from 'radix-tree';

class WildcardMatcher {
  private tree: Radix;

  constructor() {
    this.tree = new Radix();
  }

  // Add wildcard pattern
  addPattern(pattern: string, policyId: string) {
    // Reverse domain for suffix matching
    // *.facebook.com → com.facebook.*
    const reversed = this.reverseDomain(pattern);
    this.tree.insert(reversed, { policyId, pattern });
  }

  // Check if domain matches any wildcard
  match(domain: string): boolean {
    const reversed = this.reverseDomain(domain);

    // Check exact match first
    if (this.tree.find(reversed)) return true;

    // Check wildcard match (*.facebook.com)
    const parts = reversed.split('.');
    for (let i = 0; i < parts.length; i++) {
      const wildcardKey = parts.slice(i).join('.') + '.*';
      if (this.tree.find(wildcardKey)) return true;
    }

    return false;
  }

  private reverseDomain(domain: string): string {
    // www.facebook.com → com.facebook.www
    return domain.split('.').reverse().join('.');
  }
}
```

**Performance:**
- Insert: O(k) - k = pattern length
- Match: O(k * p) - p = number of parts in domain (usually 2-4)
- Memory: ~100 bytes per pattern

---

### 3.4 IP Range Matching Algorithm

**Challenge:** Check if IP `192.168.1.105` is in range `192.168.1.100-192.168.1.120` or CIDR `192.168.2.0/24`

**Solution: IP to Integer Conversion + Range Tree**

```typescript
class IPMatcher {
  private ranges: Array<{ start: number; end: number; groupId: string }> = [];

  // Convert IP to 32-bit integer for fast comparison
  private ipToInt(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  // Add IP range
  addRange(startIP: string, endIP: string, groupId: string) {
    this.ranges.push({
      start: this.ipToInt(startIP),
      end: this.ipToInt(endIP),
      groupId
    });

    // Sort ranges by start IP for binary search
    this.ranges.sort((a, b) => a.start - b.start);
  }

  // Add CIDR range
  addCIDR(cidr: string, groupId: string) {
    const [ip, bits] = cidr.split('/');
    const mask = -1 << (32 - parseInt(bits));
    const start = this.ipToInt(ip) & mask;
    const end = start + ~mask;

    this.addRange(this.intToIP(start), this.intToIP(end), groupId);
  }

  // Check if IP is in any range (O(log n) binary search)
  match(ip: string): string | null {
    const ipInt = this.ipToInt(ip);

    // Binary search
    let left = 0;
    let right = this.ranges.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const range = this.ranges[mid];

      if (ipInt >= range.start && ipInt <= range.end) {
        return range.groupId;  // Match found
      }

      if (ipInt < range.start) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;  // No match
  }

  private intToIP(int: number): string {
    return [
      (int >>> 24) & 0xFF,
      (int >>> 16) & 0xFF,
      (int >>> 8) & 0xFF,
      int & 0xFF
    ].join('.');
  }
}
```

**Performance:**
- Insert: O(log n)
- Match: O(log n) - binary search
- Memory: ~20 bytes per range

---

### 3.5 Bloom Filter for Large Blocklists (Optional Optimization)

**Use Case:** You have 1 million blocked domains (from imported blocklists)

**Problem:** Checking 1M domains is slow, even with hash maps

**Solution:** Bloom Filter for instant negative checks

```typescript
import BloomFilter from 'bloom-filter';

class BlocklistMatcher {
  private bloomFilter: BloomFilter;
  private exactDomains: Set<string>;  // For confirmation

  constructor(expectedItems: number = 1000000) {
    // False positive rate: 0.01% (1 in 10,000)
    this.bloomFilter = new BloomFilter(expectedItems, 0.0001);
    this.exactDomains = new Set();
  }

  // Add domain to blocklist
  add(domain: string) {
    this.bloomFilter.add(domain);
    this.exactDomains.add(domain);
  }

  // Check if domain is blocked
  async isBlocked(domain: string): Promise<boolean> {
    // FAST: Bloom filter check (O(k) - k = hash functions, usually 10-15)
    if (!this.bloomFilter.test(domain)) {
      return false;  // Definitely NOT in blocklist (100% certain)
    }

    // SLOW: Exact check for confirmation (handles false positives)
    return this.exactDomains.has(domain);
  }
}
```

**Performance:**
- Insert: O(k) - k = number of hash functions (~10-15)
- Match: O(k) for negative, O(1) for confirmation
- Memory: **10 MB for 1 million domains** (vs. 50+ MB for Set)

**Trade-off:**
- False positive rate: 0.01% (1 in 10,000 queries might need exact check)
- False negative rate: 0% (never misses a blocked domain)

---

## 4. Implementation Strategy

### 4.1 Phase 1: Database Setup (Week 1)

**Step 1.1: Create MongoDB Collections**

File: `/home/ankan/Documents/Projects/NexoralDNS/server/source/Database/Collections.ts`

```typescript
export const COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  DOMAINS: 'domains',
  DNS_RECORDS: 'dns_records',
  ANALYTICS: 'analytics',

  // NEW: Policy collections
  POLICIES: 'policies',
  DOMAIN_GROUPS: 'domain_groups',
  IP_GROUPS: 'ip_groups',
  POLICY_LOGS: 'policy_logs'
};
```

**Step 1.2: Create Database Schemas**

File: `/home/ankan/Documents/Projects/NexoralDNS/server/source/Database/Schemas/Policy.schema.ts`

```typescript
import { Schema, model, Document } from 'mongoose';

// Policy Schema
interface IPolicy extends Document {
  name: string;
  description: string;
  isEnabled: boolean;
  priority: number;
  policyType: string;
  source: {
    type: string;
    value: string | Schema.Types.ObjectId;
  };
  target: {
    type: string;
    value: string | Schema.Types.ObjectId;
  };
  action: string;
  redirect?: {
    type: string;
    value: string;
  };
  schedule?: {
    enabled: boolean;
    timezone: string;
    rules: Array<{
      days: string[];
      startTime: string;
      endTime: string;
    }>;
  };
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    totalBlocks: number;
    lastBlockedAt: Date;
  };
}

const PolicySchema = new Schema<IPolicy>({
  name: { type: String, required: true },
  description: { type: String },
  isEnabled: { type: Boolean, default: true },
  priority: { type: Number, default: 50, min: 1, max: 1000 },
  policyType: {
    type: String,
    enum: ['user_to_domain', 'user_to_internet', 'domain_to_all', 'time_based'],
    required: true
  },
  source: {
    type: { type: String, enum: ['single_ip', 'ip_group', 'all_users'], required: true },
    value: { type: Schema.Types.Mixed }
  },
  target: {
    type: { type: String, enum: ['single_domain', 'domain_group', 'full_internet', 'regex'], required: true },
    value: { type: Schema.Types.Mixed }
  },
  action: { type: String, enum: ['block', 'allow', 'redirect'], default: 'block' },
  redirect: {
    type: { type: String, enum: ['custom_ip', 'safe_search'] },
    value: { type: String }
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    rules: [{
      days: [{ type: String }],
      startTime: { type: String },
      endTime: { type: String }
    }]
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  stats: {
    totalBlocks: { type: Number, default: 0 },
    lastBlockedAt: { type: Date }
  }
}, {
  timestamps: true
});

// Indexes
PolicySchema.index({ isEnabled: 1, priority: -1 });
PolicySchema.index({ 'source.type': 1, 'source.value': 1 });
PolicySchema.index({ 'target.type': 1, 'target.value': 1 });

export const Policy = model<IPolicy>('policies', PolicySchema);
```

**Step 1.3: Create Indexes**

File: `/home/ankan/Documents/Projects/NexoralDNS/server/source/Database/CreateIndexes.ts`

```typescript
import { MongoClient } from 'mongodb';

async function createPolicyIndexes() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('nexoral_db');

  // Policies indexes
  await db.collection('policies').createIndex({ isEnabled: 1, priority: -1 });
  await db.collection('policies').createIndex({ 'source.type': 1, 'source.value': 1 });
  await db.collection('policies').createIndex({ 'target.type': 1, 'target.value': 1 });

  // Domain groups indexes
  await db.collection('domain_groups').createIndex({ name: 1 }, { unique: true });
  await db.collection('domain_groups').createIndex({ 'domains.domain': 1 });

  // IP groups indexes
  await db.collection('ip_groups').createIndex({ name: 1 }, { unique: true });
  await db.collection('ip_groups').createIndex({ 'ips.ip': 1 });

  // Policy logs indexes
  await db.collection('policy_logs').createIndex({ timestamp: -1 });
  await db.collection('policy_logs').createIndex({ policyId: 1, timestamp: -1 });
  await db.collection('policy_logs').createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });

  console.log('✅ Policy indexes created');
  await client.close();
}
```

---

### 4.2 Phase 2: Policy Engine (Week 2)

**Architecture:**

```
Web/src/services/Policy/
├── PolicyEngine.service.ts      # Main policy checker
├── PolicyCache.service.ts       # Redis cache manager
├── WildcardMatcher.service.ts   # Radix tree for wildcards
├── IPMatcher.service.ts         # IP range matching
└── PolicyLoader.service.ts      # Load policies from DB to cache
```

**Step 2.1: Policy Cache Service**

File: `/home/ankan/Documents/Projects/NexoralDNS/Web/src/services/Policy/PolicyCache.service.ts`

```typescript
import Redis from 'ioredis';

export class PolicyCacheService {
  private redis: Redis;
  private CACHE_TTL = 300; // 5 minutes

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Check if IP has full internet block
   */
  async hasInternetBlock(ip: string): Promise<boolean> {
    const key = `policy:internet_block:${ip}`;
    const result = await this.redis.get(key);
    return result === 'true';
  }

  /**
   * Check exact IP + Domain match
   */
  async getExactMatch(ip: string, domain: string): Promise<PolicyAction | null> {
    const key = `policy:ip:${ip}:domain:${domain}`;
    const result = await this.redis.get(key);
    return result ? JSON.parse(result) : null;
  }

  /**
   * Check domain blocked for ALL users
   */
  async getAllUsersBlock(domain: string): Promise<PolicyAction | null> {
    const key = `policy:all:domain:${domain}`;
    const result = await this.redis.get(key);
    return result ? JSON.parse(result) : null;
  }

  /**
   * Get domain group members
   */
  async getDomainGroup(groupId: string): Promise<string[]> {
    const key = `domain_group:${groupId}`;
    const result = await this.redis.get(key);
    return result ? JSON.parse(result) : [];
  }

  /**
   * Get IP group members
   */
  async getIPGroup(groupId: string): Promise<string[]> {
    const key = `ip_group:${groupId}`;
    const result = await this.redis.get(key);
    return result ? JSON.parse(result) : [];
  }

  /**
   * Cache internet block for IP
   */
  async cacheInternetBlock(ip: string): Promise<void> {
    const key = `policy:internet_block:${ip}`;
    await this.redis.setex(key, this.CACHE_TTL, 'true');
  }

  /**
   * Cache exact IP + Domain policy
   */
  async cacheExactMatch(ip: string, domain: string, policy: PolicyAction): Promise<void> {
    const key = `policy:ip:${ip}:domain:${domain}`;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(policy));
  }

  /**
   * Cache domain block for all users
   */
  async cacheAllUsersBlock(domain: string, policy: PolicyAction): Promise<void> {
    const key = `policy:all:domain:${domain}`;
    await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(policy));
  }

  /**
   * Invalidate all policy caches (call when policies change)
   */
  async invalidateAll(): Promise<void> {
    const pattern = 'policy:*';
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

interface PolicyAction {
  action: 'block' | 'allow' | 'redirect';
  policyId: string;
  priority: number;
  redirect?: string;
}
```

**Step 2.2: Wildcard Matcher Service**

File: `/home/ankan/Documents/Projects/NexoralDNS/Web/src/services/Policy/WildcardMatcher.service.ts`

```typescript
export class WildcardMatcherService {
  private patterns: Map<string, string> = new Map(); // pattern → policyId

  /**
   * Add wildcard pattern
   * Example: *.facebook.com, *.google.*
   */
  addPattern(pattern: string, policyId: string): void {
    // Normalize pattern
    const normalized = pattern.toLowerCase().trim();
    this.patterns.set(normalized, policyId);
  }

  /**
   * Check if domain matches any wildcard pattern
   */
  match(domain: string): string | null {
    const normalized = domain.toLowerCase().trim();

    // Check each pattern
    for (const [pattern, policyId] of this.patterns.entries()) {
      if (this.matchPattern(normalized, pattern)) {
        return policyId;
      }
    }

    return null;
  }

  /**
   * Match domain against wildcard pattern
   * Supports: *.example.com, example.*, *example*, *.*.example.com
   */
  private matchPattern(domain: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*');  // * → .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(domain);
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
  }

  /**
   * Get pattern count
   */
  getCount(): number {
    return this.patterns.size;
  }
}
```

**Step 2.3: Main Policy Engine**

File: `/home/ankan/Documents/Projects/NexoralDNS/Web/src/services/Policy/PolicyEngine.service.ts`

```typescript
import { PolicyCacheService } from './PolicyCache.service';
import { WildcardMatcherService } from './WildcardMatcher.service';
import { IPMatcherService } from './IPMatcher.service';
import Redis from 'ioredis';

export class PolicyEngineService {
  private cache: PolicyCacheService;
  private wildcardMatcher: WildcardMatcherService;
  private ipMatcher: IPMatcherService;

  constructor(redisClient: Redis) {
    this.cache = new PolicyCacheService(redisClient);
    this.wildcardMatcher = new WildcardMatcherService();
    this.ipMatcher = new IPMatcherService();
  }

  /**
   * Main entry point: Check if query should be blocked
   * Returns: { blocked: boolean, reason: string, policyId?: string }
   */
  async checkPolicy(domain: string, clientIP: string): Promise<PolicyResult> {
    const startTime = Date.now();

    try {
      // LAYER 1: Full internet block for IP (fastest)
      if (await this.cache.hasInternetBlock(clientIP)) {
        return {
          blocked: true,
          action: 'block',
          reason: 'Full internet blocked for IP',
          matchTime: Date.now() - startTime
        };
      }

      // LAYER 2: Exact IP + Domain match
      const exactMatch = await this.cache.getExactMatch(clientIP, domain);
      if (exactMatch) {
        return {
          blocked: exactMatch.action === 'block',
          action: exactMatch.action,
          reason: 'Exact IP+Domain policy match',
          policyId: exactMatch.policyId,
          redirect: exactMatch.redirect,
          matchTime: Date.now() - startTime
        };
      }

      // LAYER 3: Domain blocked for ALL users
      const allUsersMatch = await this.cache.getAllUsersBlock(domain);
      if (allUsersMatch) {
        return {
          blocked: allUsersMatch.action === 'block',
          action: allUsersMatch.action,
          reason: 'Domain blocked for all users',
          policyId: allUsersMatch.policyId,
          matchTime: Date.now() - startTime
        };
      }

      // LAYER 4: Wildcard domain match
      const wildcardPolicyId = this.wildcardMatcher.match(domain);
      if (wildcardPolicyId) {
        // Check if this wildcard applies to the client IP
        const applies = await this.checkWildcardApplies(wildcardPolicyId, clientIP);
        if (applies) {
          return {
            blocked: true,
            action: 'block',
            reason: 'Wildcard domain match',
            policyId: wildcardPolicyId,
            matchTime: Date.now() - startTime
          };
        }
      }

      // LAYER 5: Domain group match
      const groupMatch = await this.checkDomainGroupMatch(domain, clientIP);
      if (groupMatch) {
        return {
          blocked: groupMatch.action === 'block',
          action: groupMatch.action,
          reason: 'Domain group match',
          policyId: groupMatch.policyId,
          matchTime: Date.now() - startTime
        };
      }

      // NO MATCH - Allow
      return {
        blocked: false,
        action: 'allow',
        reason: 'No policy match',
        matchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Policy check error:', error);
      // Fail open (allow on error to prevent DNS outage)
      return {
        blocked: false,
        action: 'allow',
        reason: 'Policy check error (fail-open)',
        matchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if wildcard policy applies to IP
   */
  private async checkWildcardApplies(policyId: string, clientIP: string): Promise<boolean> {
    // Implementation: Query Redis or MongoDB for policy details
    // Check if policy's source matches clientIP
    return true; // Simplified
  }

  /**
   * Check domain group membership and IP matching
   */
  private async checkDomainGroupMatch(domain: string, clientIP: string): Promise<PolicyAction | null> {
    // Implementation:
    // 1. Find all domain groups containing this domain
    // 2. Find all policies using those groups
    // 3. Check if any policy applies to clientIP
    return null; // Simplified
  }

  /**
   * Reload all policies from database into cache/memory
   */
  async reloadPolicies(): Promise<void> {
    console.log('🔄 Reloading policies from database...');

    // 1. Clear existing caches
    await this.cache.invalidateAll();
    this.wildcardMatcher.clear();

    // 2. Load active policies from MongoDB
    const policies = await this.loadActivePolicies();

    // 3. Build caches based on policy types
    for (const policy of policies) {
      await this.buildPolicyCache(policy);
    }

    console.log(`✅ Loaded ${policies.length} active policies`);
  }

  /**
   * Load active policies from MongoDB
   */
  private async loadActivePolicies(): Promise<any[]> {
    // Query MongoDB for enabled policies, sorted by priority
    const db = getDB();
    return await db.collection('policies')
      .find({ isEnabled: true })
      .sort({ priority: -1 })
      .toArray();
  }

  /**
   * Build Redis cache for a policy
   */
  private async buildPolicyCache(policy: any): Promise<void> {
    const action = {
      action: policy.action,
      policyId: policy._id.toString(),
      priority: policy.priority,
      redirect: policy.redirect?.value
    };

    // Handle different policy types
    if (policy.policyType === 'user_to_internet') {
      // Full internet block
      if (policy.source.type === 'single_ip') {
        await this.cache.cacheInternetBlock(policy.source.value);
      } else if (policy.source.type === 'ip_group') {
        const ips = await this.cache.getIPGroup(policy.source.value);
        for (const ip of ips) {
          await this.cache.cacheInternetBlock(ip);
        }
      }
    }
    else if (policy.policyType === 'user_to_domain') {
      // Specific domain for specific IP
      if (policy.target.type === 'single_domain') {
        if (policy.source.type === 'single_ip') {
          await this.cache.cacheExactMatch(
            policy.source.value,
            policy.target.value,
            action
          );
        }
      } else if (policy.target.type === 'domain_group') {
        // Load domain group and cache each domain
        const domains = await this.loadDomainGroup(policy.target.value);
        for (const domainObj of domains) {
          if (domainObj.type === 'wildcard') {
            this.wildcardMatcher.addPattern(domainObj.domain, policy._id.toString());
          } else {
            if (policy.source.type === 'single_ip') {
              await this.cache.cacheExactMatch(
                policy.source.value,
                domainObj.domain,
                action
              );
            }
          }
        }
      }
    }
    else if (policy.policyType === 'domain_to_all') {
      // Domain blocked for ALL users
      if (policy.target.type === 'single_domain') {
        await this.cache.cacheAllUsersBlock(policy.target.value, action);
      } else if (policy.target.type === 'domain_group') {
        const domains = await this.loadDomainGroup(policy.target.value);
        for (const domainObj of domains) {
          if (domainObj.type === 'wildcard') {
            this.wildcardMatcher.addPattern(domainObj.domain, policy._id.toString());
          } else {
            await this.cache.cacheAllUsersBlock(domainObj.domain, action);
          }
        }
      }
    }
  }

  /**
   * Load domain group from database
   */
  private async loadDomainGroup(groupId: string): Promise<any[]> {
    const db = getDB();
    const group = await db.collection('domain_groups').findOne({ _id: groupId });
    return group?.domains || [];
  }
}

interface PolicyResult {
  blocked: boolean;
  action: 'block' | 'allow' | 'redirect';
  reason: string;
  policyId?: string;
  redirect?: string;
  matchTime: number;
}

interface PolicyAction {
  action: 'block' | 'allow' | 'redirect';
  policyId: string;
  priority: number;
  redirect?: string;
}
```

---

### 4.3 Phase 3: Integrate with DNS Query (Week 2)

**Modify DNS Rules Service**

File: `/home/ankan/Documents/Projects/NexoralDNS/Web/src/services/Start/Rules.service.ts`

```typescript
import { PolicyEngineService } from '../Policy/PolicyEngine.service';

export class RulesService {
  private policyEngine: PolicyEngineService;

  constructor() {
    this.policyEngine = new PolicyEngineService(redisClient);
  }

  async processQuery(queryName: string, rinfo: any, msg: any): Promise<void> {
    const startTime = Date.now();

    // 1. Check service status
    const serviceStatus = await this.checkServiceStatus();
    if (!serviceStatus.active) {
      this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 5);
      return;
    }

    // 2. 🆕 CHECK POLICY (NEW!)
    const policyResult = await this.policyEngine.checkPolicy(queryName, rinfo.address);

    if (policyResult.blocked) {
      // Log blocked query
      await this.logBlockedQuery(queryName, rinfo.address, policyResult);

      if (policyResult.action === 'redirect' && policyResult.redirect) {
        // Redirect to custom IP
        this.IO.buildSendAnswer(msg, rinfo, queryName, policyResult.redirect, 300);
      } else {
        // Block (return 0.0.0.0)
        this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 5);
      }

      return;
    }

    // 3. Check Redis cache
    const cacheResult = await this.checkCache(queryName);
    if (cacheResult) {
      this.IO.buildSendAnswer(msg, rinfo, queryName, cacheResult.ip, cacheResult.ttl);
      await this.logQuery(queryName, rinfo.address, 'FROM_CACHE', Date.now() - startTime);
      return;
    }

    // 4. Check database
    const dbResult = await this.checkDatabase(queryName);
    if (dbResult) {
      // Cache result
      await this.cacheResult(queryName, dbResult.ip, dbResult.ttl);
      this.IO.buildSendAnswer(msg, rinfo, queryName, dbResult.ip, dbResult.ttl);
      await this.logQuery(queryName, rinfo.address, 'FROM_DB', Date.now() - startTime);
      return;
    }

    // 5. Forward to upstream DNS
    const upstreamResult = await this.forwardToUpstream(queryName);
    if (upstreamResult) {
      this.IO.buildSendAnswer(msg, rinfo, queryName, upstreamResult.ip, upstreamResult.ttl);
      await this.logQuery(queryName, rinfo.address, 'UPSTREAM', Date.now() - startTime);
      return;
    }

    // 6. No result found
    this.IO.buildSendAnswer(msg, rinfo, queryName, "0.0.0.0", 5);
    await this.logQuery(queryName, rinfo.address, 'FAILED', Date.now() - startTime);
  }

  /**
   * Log blocked query to policy_logs collection
   */
  private async logBlockedQuery(domain: string, clientIP: string, result: PolicyResult): Promise<void> {
    const db = getDB();
    await db.collection('policy_logs').insertOne({
      policyId: result.policyId,
      domain,
      clientIP,
      action: result.action,
      matchTime: result.matchTime,
      timestamp: new Date(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days TTL
    });

    // Update policy stats
    if (result.policyId) {
      await db.collection('policies').updateOne(
        { _id: result.policyId },
        {
          $inc: { 'stats.totalBlocks': 1 },
          $set: { 'stats.lastBlockedAt': new Date() }
        }
      );
    }
  }
}
```

---

### 4.4 Phase 4: Backend API Endpoints (Week 3)

**Policy CRUD APIs**

File: `/home/ankan/Documents/Projects/NexoralDNS/server/source/Router/Policy/Policy.route.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { PolicyService } from '../../Services/Policy/Policy.service';

export async function PolicyRoutes(fastify: FastifyInstance) {
  const policyService = new PolicyService();

  // Create policy
  fastify.post('/api/policies', {
    preHandler: [fastify.authGuard, fastify.permissionGuard([22])], // Permission: Manage Policies
    schema: {
      body: {
        type: 'object',
        required: ['name', 'policyType', 'source', 'target'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          policyType: { type: 'string', enum: ['user_to_domain', 'user_to_internet', 'domain_to_all'] },
          source: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['single_ip', 'ip_group', 'all_users'] },
              value: { type: 'string' }
            }
          },
          target: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['single_domain', 'domain_group', 'full_internet'] },
              value: { type: 'string' }
            }
          },
          action: { type: 'string', enum: ['block', 'allow', 'redirect'], default: 'block' },
          priority: { type: 'number', default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const result = await policyService.createPolicy(request.body, request.user.userId);
    return reply.status(201).send(result);
  });

  // List all policies
  fastify.get('/api/policies', {
    preHandler: [fastify.authGuard]
  }, async (request, reply) => {
    const policies = await policyService.listPolicies();
    return reply.send(policies);
  });

  // Get policy by ID
  fastify.get('/api/policies/:id', {
    preHandler: [fastify.authGuard]
  }, async (request, reply) => {
    const policy = await policyService.getPolicyById(request.params.id);
    return reply.send(policy);
  });

  // Update policy
  fastify.put('/api/policies/:id', {
    preHandler: [fastify.authGuard, fastify.permissionGuard([22])]
  }, async (request, reply) => {
    const result = await policyService.updatePolicy(request.params.id, request.body);
    return reply.send(result);
  });

  // Delete policy
  fastify.delete('/api/policies/:id', {
    preHandler: [fastify.authGuard, fastify.permissionGuard([22])]
  }, async (request, reply) => {
    const result = await policyService.deletePolicy(request.params.id);
    return reply.send(result);
  });

  // Toggle policy (enable/disable)
  fastify.patch('/api/policies/:id/toggle', {
    preHandler: [fastify.authGuard, fastify.permissionGuard([22])]
  }, async (request, reply) => {
    const result = await policyService.togglePolicy(request.params.id);
    return reply.send(result);
  });
}
```

**Policy Service**

File: `/home/ankan/Documents/Projects/NexoralDNS/server/source/Services/Policy/Policy.service.ts`

```typescript
import { ObjectId } from 'mongodb';
import { getDB } from '../../Database/Connection';
import Redis from 'ioredis';

export class PolicyService {
  private db = getDB();
  private redis = new Redis();

  /**
   * Create new policy
   */
  async createPolicy(data: any, userId: string) {
    // Validate input
    this.validatePolicyData(data);

    // Insert to database
    const result = await this.db.collection('policies').insertOne({
      ...data,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalBlocks: 0,
        lastBlockedAt: null
      }
    });

    // Trigger policy reload in DNS service
    await this.triggerPolicyReload();

    return {
      success: true,
      policyId: result.insertedId,
      message: 'Policy created successfully'
    };
  }

  /**
   * List all policies
   */
  async listPolicies() {
    const policies = await this.db.collection('policies')
      .find()
      .sort({ priority: -1, createdAt: -1 })
      .toArray();

    return {
      success: true,
      policies,
      total: policies.length
    };
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(id: string) {
    const policy = await this.db.collection('policies').findOne({
      _id: new ObjectId(id)
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    return {
      success: true,
      policy
    };
  }

  /**
   * Update policy
   */
  async updatePolicy(id: string, data: any) {
    this.validatePolicyData(data);

    const result = await this.db.collection('policies').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Policy not found');
    }

    // Trigger policy reload
    await this.triggerPolicyReload();

    return {
      success: true,
      message: 'Policy updated successfully'
    };
  }

  /**
   * Delete policy
   */
  async deletePolicy(id: string) {
    const result = await this.db.collection('policies').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      throw new Error('Policy not found');
    }

    // Trigger policy reload
    await this.triggerPolicyReload();

    return {
      success: true,
      message: 'Policy deleted successfully'
    };
  }

  /**
   * Toggle policy enabled/disabled
   */
  async togglePolicy(id: string) {
    const policy = await this.db.collection('policies').findOne({
      _id: new ObjectId(id)
    });

    if (!policy) {
      throw new Error('Policy not found');
    }

    const newStatus = !policy.isEnabled;

    await this.db.collection('policies').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isEnabled: newStatus, updatedAt: new Date() } }
    );

    // Trigger policy reload
    await this.triggerPolicyReload();

    return {
      success: true,
      isEnabled: newStatus,
      message: `Policy ${newStatus ? 'enabled' : 'disabled'} successfully`
    };
  }

  /**
   * Trigger policy reload in DNS service via Redis pub/sub
   */
  private async triggerPolicyReload() {
    await this.redis.publish('policy:reload', JSON.stringify({
      timestamp: Date.now()
    }));
  }

  /**
   * Validate policy data
   */
  private validatePolicyData(data: any) {
    if (!data.name) throw new Error('Policy name is required');
    if (!data.policyType) throw new Error('Policy type is required');
    if (!data.source) throw new Error('Source configuration is required');
    if (!data.target) throw new Error('Target configuration is required');

    // Add more validation as needed
  }
}
```

---

## 5. Code Examples

### 5.1 Complete DNS Query Flow with Policies

```typescript
// File: Web/src/services/Start/Rules.service.ts

class RulesService {
  async handleDNSQuery(msg: DNSPacket, rinfo: RemoteInfo) {
    const queryName = msg.questions[0].name;
    const clientIP = rinfo.address;
    const startTime = Date.now();

    console.log(`📥 Query: ${queryName} from ${clientIP}`);

    // Step 1: Service check
    if (!await this.isServiceActive()) {
      return this.sendBlockedResponse(msg, rinfo, queryName, "Service disabled");
    }

    // Step 2: Policy check ⭐
    const policyResult = await this.policyEngine.checkPolicy(queryName, clientIP);

    if (policyResult.blocked) {
      console.log(`🚫 BLOCKED: ${queryName} - ${policyResult.reason}`);
      await this.logAnalytics(queryName, clientIP, 'BLOCKED', policyResult.matchTime);

      if (policyResult.action === 'redirect') {
        return this.sendResponse(msg, rinfo, queryName, policyResult.redirect, 300);
      } else {
        return this.sendBlockedResponse(msg, rinfo, queryName, policyResult.reason);
      }
    }

    // Step 3: Cache check
    const cached = await this.redis.get(`dns:${queryName}`);
    if (cached) {
      const { ip, ttl } = JSON.parse(cached);
      console.log(`✅ CACHE HIT: ${queryName} → ${ip}`);
      await this.logAnalytics(queryName, clientIP, 'FROM_CACHE', Date.now() - startTime);
      return this.sendResponse(msg, rinfo, queryName, ip, ttl);
    }

    // Step 4: Database check
    const record = await this.db.collection('dns_records').findOne({ name: queryName });
    if (record) {
      console.log(`✅ DB HIT: ${queryName} → ${record.value}`);
      await this.redis.setex(`dns:${queryName}`, record.ttl, JSON.stringify({
        ip: record.value,
        ttl: record.ttl
      }));
      await this.logAnalytics(queryName, clientIP, 'FROM_DB', Date.now() - startTime);
      return this.sendResponse(msg, rinfo, queryName, record.value, record.ttl);
    }

    // Step 5: Upstream forward
    const upstream = await this.forwardToGoogle(queryName);
    if (upstream) {
      console.log(`✅ UPSTREAM: ${queryName} → ${upstream.ip}`);
      await this.logAnalytics(queryName, clientIP, 'UPSTREAM', Date.now() - startTime);
      return this.sendResponse(msg, rinfo, queryName, upstream.ip, upstream.ttl);
    }

    // Step 6: No result
    console.log(`❌ FAILED: ${queryName}`);
    await this.logAnalytics(queryName, clientIP, 'FAILED', Date.now() - startTime);
    return this.sendBlockedResponse(msg, rinfo, queryName, "Not found");
  }
}
```

### 5.2 Policy Reload Listener

```typescript
// File: Web/src/services/Policy/PolicyReloadListener.ts

import Redis from 'ioredis';
import { PolicyEngineService } from './PolicyEngine.service';

export class PolicyReloadListener {
  private subscriber: Redis;
  private policyEngine: PolicyEngineService;

  constructor(policyEngine: PolicyEngineService) {
    this.subscriber = new Redis();
    this.policyEngine = policyEngine;
  }

  /**
   * Start listening for policy reload events
   */
  async start() {
    await this.subscriber.subscribe('policy:reload');

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'policy:reload') {
        console.log('🔄 Policy reload triggered');
        await this.policyEngine.reloadPolicies();
        console.log('✅ Policies reloaded successfully');
      }
    });

    console.log('👂 Listening for policy reload events...');
  }
}

// Usage in Web/src/index.ts
const policyEngine = new PolicyEngineService(redisClient);
const reloadListener = new PolicyReloadListener(policyEngine);
await reloadListener.start();

// Initial load
await policyEngine.reloadPolicies();
```

---

## 6. Performance Optimization

### 6.1 Benchmarking Tool

```typescript
// File: Web/src/tools/benchmark-policies.ts

import { PolicyEngineService } from '../services/Policy/PolicyEngine.service';

async function benchmarkPolicyEngine() {
  const engine = new PolicyEngineService(redisClient);
  await engine.reloadPolicies();

  const testCases = [
    { domain: 'facebook.com', ip: '192.168.1.100' },
    { domain: 'google.com', ip: '192.168.1.100' },
    { domain: 'm.facebook.com', ip: '192.168.1.101' },
    { domain: 'example.com', ip: '192.168.1.200' }
  ];

  console.log('🚀 Starting policy engine benchmark...\n');

  for (const test of testCases) {
    const iterations = 10000;
    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      await engine.checkPolicy(test.domain, test.ip);
    }

    const duration = Date.now() - start;
    const avgTime = duration / iterations;

    console.log(`Domain: ${test.domain}, IP: ${test.ip}`);
    console.log(`  Total: ${duration}ms for ${iterations} queries`);
    console.log(`  Average: ${avgTime.toFixed(3)}ms per query`);
    console.log(`  Throughput: ${Math.round(iterations / (duration / 1000))} queries/sec\n`);
  }
}

benchmarkPolicyEngine();
```

**Expected Results:**
```
Domain: facebook.com, IP: 192.168.1.100
  Total: 250ms for 10000 queries
  Average: 0.025ms per query
  Throughput: 40,000 queries/sec

Domain: google.com, IP: 192.168.1.100
  Total: 180ms for 10000 queries
  Average: 0.018ms per query
  Throughput: 55,000 queries/sec
```

### 6.2 Monitoring Dashboard

Add to existing analytics:

```typescript
// GET /api/analytics/policy-performance
{
  "avgMatchTime": 0.8,  // ms
  "cacheHitRate": 95.2,  // %
  "totalPolicies": 42,
  "activePolicies": 38,
  "topBlockedDomains": [
    { "domain": "facebook.com", "blocks": 1523 },
    { "domain": "youtube.com", "blocks": 892 }
  ],
  "blocksByIP": [
    { "ip": "192.168.1.100", "blocks": 453 },
    { "ip": "192.168.1.101", "blocks": 289 }
  ]
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// File: Web/tests/PolicyEngine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngineService } from '../src/services/Policy/PolicyEngine.service';

describe('PolicyEngine', () => {
  let engine: PolicyEngineService;

  beforeEach(async () => {
    engine = new PolicyEngineService(redisClient);
    await engine.reloadPolicies();
  });

  it('should block domain for specific IP', async () => {
    // Setup: Create policy blocking facebook.com for 192.168.1.100
    const result = await engine.checkPolicy('facebook.com', '192.168.1.100');

    expect(result.blocked).toBe(true);
    expect(result.action).toBe('block');
    expect(result.matchTime).toBeLessThan(2); // Less than 2ms
  });

  it('should allow domain for different IP', async () => {
    const result = await engine.checkPolicy('facebook.com', '192.168.1.200');

    expect(result.blocked).toBe(false);
    expect(result.action).toBe('allow');
  });

  it('should match wildcard domains', async () => {
    const result = await engine.checkPolicy('m.facebook.com', '192.168.1.100');

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('wildcard');
  });

  it('should handle full internet block', async () => {
    const result = await engine.checkPolicy('google.com', '192.168.1.100');

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Full internet');
  });

  it('should be fast (<5ms average)', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await engine.checkPolicy('test.com', '192.168.1.100');
      times.push(result.matchTime);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    expect(avg).toBeLessThan(5);
  });
});
```

### 7.2 Integration Tests

```typescript
// File: Web/tests/DNSWithPolicies.test.ts

describe('DNS Query with Policies', () => {
  it('should block DNS query based on policy', async () => {
    // Send DNS query for facebook.com from 192.168.1.100
    const response = await sendDNSQuery('facebook.com', '192.168.1.100');

    expect(response.answers[0].address).toBe('0.0.0.0');
  });

  it('should redirect DNS query', async () => {
    // Policy: Redirect ads.example.com to 192.168.1.50
    const response = await sendDNSQuery('ads.example.com', '192.168.1.100');

    expect(response.answers[0].address).toBe('192.168.1.50');
  });

  it('should log blocked queries to analytics', async () => {
    await sendDNSQuery('facebook.com', '192.168.1.100');

    const logs = await db.collection('policy_logs').find({
      domain: 'facebook.com',
      clientIP: '192.168.1.100'
    }).toArray();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('blocked');
  });
});
```

---

## 8. Summary

### Implementation Checklist

**Week 1: Database Setup**
- [ ] Create MongoDB collections (policies, domain_groups, ip_groups, policy_logs)
- [ ] Create database schemas with Mongoose
- [ ] Create indexes for fast queries
- [ ] Seed sample data for testing

**Week 2: Policy Engine**
- [ ] Build PolicyCacheService (Redis layer)
- [ ] Build WildcardMatcherService (Radix tree)
- [ ] Build IPMatcherService (IP range matching)
- [ ] Build PolicyEngineService (main orchestrator)
- [ ] Integrate with DNS Rules.service.ts
- [ ] Add policy reload listener (Redis pub/sub)

**Week 3: Backend APIs**
- [ ] Create Policy CRUD endpoints
- [ ] Create DomainGroup CRUD endpoints
- [ ] Create IPGroup CRUD endpoints
- [ ] Add policy analytics endpoints
- [ ] Add permission guards (RBAC)

**Week 4: Frontend Integration**
- [ ] Connect existing UI to backend APIs
- [ ] Test policy creation wizard
- [ ] Test policy enforcement
- [ ] Add real-time stats

**Week 5-6: Testing & Optimization**
- [ ] Write unit tests (80% coverage)
- [ ] Write integration tests
- [ ] Performance benchmarking
- [ ] Load testing (1000+ policies)
- [ ] Documentation

### Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Policy check time | <2ms | TBD |
| Cache hit rate | >95% | TBD |
| DNS query latency (cached) | <3ms total | TBD |
| DNS query latency (uncached) | <10ms total | TBD |
| Throughput | >10,000 queries/sec | TBD |
| Policy reload time | <500ms | TBD |

### Next Steps

1. **Review this guide** and ask questions
2. **Start with Phase 1** (Database setup)
3. **Test incrementally** (don't build everything at once)
4. **Benchmark early** (identify bottlenecks)
5. **Document as you go** (API docs, code comments)

---

**Generated:** 2025-12-16
**Author:** Claude Code
**Status:** Ready for Implementation
