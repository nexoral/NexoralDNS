# GitHub Copilot CLI Instructions for NexoralDNS

## Project Overview

**NexoralDNS** - Advanced DNS Management & Surveillance System for Local Area Networks

- **Stack**: TypeScript (strict) → CommonJS, Node.js ≥18.0.0
- **Architecture**: 7-Layer DNS query processing
- **Performance**: Sub-5ms response with Redis caching
- **Components**: DNS Server (UDP), Web Dashboard, DHCP Server

## ⚠️ CRITICAL WARNING: LAN-ONLY

**NEVER suggest cloud or public deployment**
- ISPs will block DNS spoofing on cloud/public networks
- Service will become non-functional
- This is STRICTLY for Local Area Network use only

## Core Rules (NON-NEGOTIABLE)

### 1. ALWAYS Build
```bash
cd server && npm run build    # After server code changes
cd Web && npm run build       # After dashboard changes
cd DHCP && npm run build      # After DHCP changes
```
**Why**: Catch TypeScript errors immediately, not in production.

### 2. ALWAYS Test
- **Location**: `Test/` directory
- **Files**: `dns.test.js`, `cache.test.js`, `blocklist.test.js`, `performance.test.js`
- **Requirement**: Update tests for ANY feature change
- **Run**: `cd Test && npm test`

### 3. NEVER Incomplete
**Definition of "Done"**:
- ✅ Code follows strict TypeScript standards
- ✅ `npm run build` passes in affected module
- ✅ Tests added/updated in `Test/`
- ✅ All tests pass
- ✅ Performance targets met (<5ms)
- ✅ Documentation updated (README, ARCHITECTURE, FEATURES)
- ✅ Backward compatible (no breaking changes)
- ✅ LAN-only usage emphasized

### 4. Performance First
- **Cache hit**: <2ms response time
- **DB lookup**: <5ms response time
- **Upstream DNS**: <50ms response time
- Optimize every query path

### 5. TypeScript Strict
```typescript
// ❌ NEVER
const data: any = complexObject;

// ✅ ALWAYS
interface DNSQueryResult {
  answers: DNSAnswer[];
  ttl: number;
  cached: boolean;
  responseTime: number;
}
const data: DNSQueryResult = complexObject;
```

## Architecture

### 7-Layer DNS Query Processing
```
Layer 1: Cache (Redis)           - 0.5-1ms   ⚡
Layer 2: Service Status Check    - 0.5ms
Layer 3: Block List Check        - 0.5ms
Layer 4: Client Plan Validation  - 1ms
Layer 5: Custom Records (MongoDB)- 2ms
Layer 6: Domain Rerouting        - 1ms
Layer 7: Upstream DNS Fallback   - 20-50ms
```

### Module Organization

```
server/
  src/
    core/           # DNS packet handler, Fastify server
    services/       # 7-layer processing logic
      Rules.service.ts      # Main query processing
      Cache.service.ts      # Redis caching
      BlockList.service.ts  # Domain blocking
    database/       # MongoDB schemas
    cluster/        # Multi-process cluster mode

Web/                # React admin dashboard (Vite)
DHCP/               # DHCP server (TypeScript)
client/             # Client SDK
Test/               # Test suites
```

## Naming Conventions

- **Files**: `{Feature}.service.ts`, `{Model}.schema.ts`, `{Feature}.controller.ts`
- **Classes**: PascalCase - `RulesService`, `DNSPacketHandler`, `CacheService`
- **Methods**: camelCase verbs - `processQuery()`, `validateDomain()`, `getRecord()`
- **Variables**: camelCase descriptive - `dnsQuery`, `clientIP`, `responseTime`
- **Constants**: UPPER_SNAKE_CASE - `MAX_QUERY_SIZE`, `DEFAULT_TTL`

## Error Handling

### DNS Query Path (CRITICAL)
```typescript
async function processQuery(query: DNSQuery): Promise<DNSResponse> {
  try {
    const response = await processLayers(query);
    return response;
  } catch (error) {
    // NEVER throw in DNS path - always return valid response
    logger.error('Query processing failed', { error, query });
    return createNXDOMAIN(query); // Graceful fallback
  }
}
```

**Always**:
- Never throw exceptions in DNS query path
- Log detailed errors with context
- Return valid DNS responses (NXDOMAIN, SERVFAIL)
- Use specific error messages

## Performance Best Practices

### 1. Cache First
```typescript
const cacheKey = `dns:${domain}:${type}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return { ...JSON.parse(cached), cached: true, responseTime: 1 };
}

const result = await queryDatabase(domain, type);
await redis.setex(cacheKey, ttl, JSON.stringify(result));
```

### 2. Batch Operations
```typescript
// ✅ GOOD: Parallel
const results = await Promise.all([
  checkBlockList(domain),
  getClientPlan(clientIP),
  getCustomRecord(domain)
]);

// ❌ BAD: Sequential
const blocked = await checkBlockList(domain);
const plan = await getClientPlan(clientIP);
const record = await getCustomRecord(domain);
```

### 3. Use Efficient Database Queries
```typescript
// ✅ GOOD: Single query with $in
const records = await DNSRecord.find({ domain: { $in: domains } });

// ❌ BAD: Multiple queries
for (const domain of domains) {
  await DNSRecord.findOne({ domain });
}
```

## Security

### 1. Validate DNS Queries
```typescript
function validateDomain(domain: string): boolean {
  // Check max length (253 chars)
  if (domain.length > 253) return false;

  // Check valid characters
  const validPattern = /^[a-zA-Z0-9.-]+$/;
  if (!validPattern.test(domain)) return false;

  // Check label lengths
  const labels = domain.split('.');
  return labels.every(label => label.length > 0 && label.length <= 63);
}
```

### 2. Rate Limiting
```typescript
// Prevent DNS amplification attacks
const count = await redis.incr(`ratelimit:${clientIP}`);
if (count === 1) {
  await redis.expire(`ratelimit:${clientIP}`, 60); // 1 minute window
}

if (count > 100) { // Max 100 queries/minute
  return createRateLimitResponse();
}
```

### 3. Client Authentication
```typescript
const client = await Client.findOne({ ip: clientIP });
if (!client || !client.active) {
  return createUnauthorizedResponse();
}

if (client.plan === 'free' && feature.requiresPremium) {
  return createUpgradeRequiredResponse();
}
```

## Documentation Requirements

Update when features change:

1. **README.md** - Installation, usage, configuration
2. **ARCHITECTURE.md** - Flow diagrams, layer descriptions, schema updates
3. **FEATURES.md** - New features, usage examples, limitations
4. **JSDoc** - All public methods with examples

## Common Anti-Patterns to AVOID

❌ Using `any` types
❌ Suggesting cloud/public deployment
❌ Ignoring performance targets (<5ms)
❌ Breaking backward compatibility
❌ Sequential operations when parallel possible
❌ Throwing exceptions in DNS query path
❌ Missing error handling
❌ Skipping documentation
❌ Hardcoded values (use constants)

## Commands

```bash
# Build & Test
cd server && npm run build      # Compile TypeScript
cd server && npm run dev        # Dev mode (auto-reload)
cd server && npm start          # Production (cluster mode)

cd Web && npm run dev           # Dashboard dev server
cd Web && npm run build         # Dashboard production build

cd DHCP && npm run build        # Compile DHCP server
cd DHCP && npm start            # Start DHCP server

cd Test && npm test             # Run all tests
cd Test && npm run test:perf    # Performance tests
```

## Success Criteria

Every task must meet ALL:
- ✅ Builds successfully (`npm run build` in affected module)
- ✅ Tests pass (`cd Test && npm test`)
- ✅ Performance targets met (<5ms for DB, <50ms for upstream)
- ✅ Documentation updated
- ✅ Backward compatible
- ✅ LAN-only deployment emphasized
- ✅ No `any` types
- ✅ Proper error handling
