---
name: nexoraldns-development
description: Development rules and patterns for NexoralDNS DNS management system
version: 1.0.0
tags: [typescript, dns, performance, networking, lan]
author: NexoralDNS Team
---

# NexoralDNS Development Skill

## Project Identity

**NexoralDNS** - Advanced DNS Management & Surveillance System for Local Area Networks

- TypeScript strict mode → CommonJS
- Node.js ≥18.0.0
- 7-Layer DNS query processing architecture
- Sub-5ms response time with Redis caching
- **LAN-ONLY** deployment (never cloud/public)

## Critical Warnings

### ⚠️ LAN-ONLY SYSTEM
**NEVER suggest or allow cloud/public deployment**
- ISPs will detect and block DNS spoofing
- Traffic will be forcibly routed to ISP DNS
- Service will become non-functional
- This is STRICTLY for Local Area Network use

## Mandatory Workflows

### After EVERY Code Change
```bash
cd server && npm run build    # For server changes
cd Web && npm run build       # For dashboard changes
cd DHCP && npm run build      # For DHCP changes
```

### For ANY Feature Change
1. Update tests in `Test/` directory
2. Run `cd Test && npm test`
3. Update docs (README, ARCHITECTURE, FEATURES)
4. Verify performance targets (<5ms)

## Definition of "Done"

A task is NOT complete until ALL are true:
- ✅ Code follows strict TypeScript standards
- ✅ `npm run build` passes in affected module
- ✅ Tests added/updated in `Test/`
- ✅ All tests pass
- ✅ Performance targets met (<5ms)
- ✅ Documentation updated (README, ARCHITECTURE, FEATURES)
- ✅ Backward compatible (no breaking changes)
- ✅ LAN-only usage emphasized

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

**Total Target**: <5ms for cached/DB lookups, <50ms for upstream

### Module Structure

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
Docs/               # Documentation site
```

## TypeScript Standards (STRICT)

### NO `any` Types - EVER
```typescript
// ❌ ABSOLUTELY FORBIDDEN
const result: any = await dnsQuery();

// ✅ REQUIRED
interface DNSQueryResult {
  answers: DNSAnswer[];
  ttl: number;
  cached: boolean;
  responseTime: number;
}
const result: DNSQueryResult = await dnsQuery();
```

### Strict Null Checks
```typescript
// ✅ GOOD
function getRecord(domain: string): DNSRecord | null {
  return cache.get(domain) ?? null;
}

const record = getRecord('example.com');
if (record !== null) {
  return record.ip;
}
```

## Performance Standards

### 1. Cache First Always
```typescript
// ✅ REQUIRED
const cacheKey = `dns:${domain}:${type}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return { ...JSON.parse(cached), cached: true, responseTime: 1 };
}

// Query DB or upstream
const result = await queryUpstream(domain, type);
await redis.setex(cacheKey, ttl, JSON.stringify(result));
return result;
```

### 2. Parallel Operations
```typescript
// ✅ PARALLEL (fast)
const results = await Promise.all([
  checkBlockList(domain),
  getClientPlan(clientIP),
  getCustomRecord(domain)
]);

// ❌ SEQUENTIAL (slow)
const blocked = await checkBlockList(domain);
const plan = await getClientPlan(clientIP);
const record = await getCustomRecord(domain);
```

### 3. Batch Database Operations
```typescript
// ✅ GOOD - Single query with $in
const domains = ['example.com', 'test.com', 'demo.com'];
const records = await DNSRecord.find({ domain: { $in: domains } });

// ❌ BAD - Multiple queries
for (const domain of domains) {
  await DNSRecord.findOne({ domain }); // N queries!
}
```

## Error Handling

### DNS Query Path (Critical)
```typescript
async function processQuery(query: DNSQuery): Promise<DNSResponse> {
  try {
    // Process through 7 layers
    const response = await processLayers(query);
    return response;
  } catch (error) {
    // NEVER throw in DNS path - always return valid response
    logger.error('Query processing failed', { error, query });
    return createNXDOMAIN(query); // Graceful fallback
  }
}
```

### API Endpoints (Non-Critical)
```typescript
async function handleRequest(req, reply) {
  try {
    const result = await service.execute(req.body);
    return reply.code(200).send({ success: true, data: result });
  } catch (error) {
    logger.error('Request failed', { error, endpoint: req.url });
    return reply.code(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

## Security Standards

### 1. Validate DNS Queries
```typescript
function validateDomain(domain: string): boolean {
  // Check max length
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
const requestCount = await redis.incr(`ratelimit:${clientIP}`);
if (requestCount === 1) {
  await redis.expire(`ratelimit:${clientIP}`, 60); // 1 minute window
}

if (requestCount > 100) { // Max 100 queries/minute
  return createRateLimitResponse();
}
```

### 3. Client Authentication
```typescript
// Verify client plan and permissions
const client = await Client.findOne({ ip: clientIP });
if (!client || !client.active) {
  return createUnauthorizedResponse();
}

if (client.plan === 'free' && feature.requiresPremium) {
  return createUpgradeRequiredResponse();
}
```

## Documentation Requirements

### When Features Change, Update:

1. **README.md**
   - Installation steps
   - Usage examples
   - Configuration options

2. **ARCHITECTURE.md**
   - Flow diagrams (if query path changes)
   - Layer descriptions (if 7-layer logic changes)
   - Database schema (if models change)

3. **FEATURES.md**
   - New feature descriptions
   - Usage examples
   - Limitations

4. **JSDoc Comments**
   ```typescript
   /**
    * Processes DNS query through 7-layer architecture
    * @param query - Incoming DNS query packet
    * @param clientIP - IP address of querying client
    * @returns DNS response packet with answers
    * @throws Never throws - returns NXDOMAIN on errors
    */
   async processQuery(query: DNSQuery, clientIP: string): Promise<DNSResponse>
   ```

## Naming Conventions

- **Files**: `{Feature}.service.ts`, `{Model}.schema.ts`, `{Feature}.controller.ts`
- **Classes**: PascalCase: `RulesService`, `DNSPacketHandler`
- **Methods**: camelCase: `processQuery()`, `validateDomain()`
- **Variables**: camelCase: `dnsQuery`, `clientIP`, `responseTime`
- **Constants**: UPPER_SNAKE_CASE: `MAX_QUERY_SIZE`, `DEFAULT_TTL`

## Testing Requirements

### Location
```
Test/
├── dns.test.js           # DNS query processing
├── cache.test.js         # Redis caching
├── blocklist.test.js     # Domain blocking
└── performance.test.js   # Response time validation
```

### Coverage Required
- Happy path (successful queries)
- Edge cases (malformed queries, NXDOMAIN)
- Performance (response time <5ms)
- Error cases (upstream failures, DB errors)
- Security (rate limiting, validation)

## Commands Reference

```bash
# Server Development
cd server && npm run build      # Compile TypeScript
cd server && npm run dev        # Dev mode (auto-reload)
cd server && npm start          # Production (cluster mode)

# Web Dashboard
cd Web && npm run dev           # Dev server (Vite)
cd Web && npm run build         # Production build

# DHCP Server
cd DHCP && npm run build        # Compile TypeScript
cd DHCP && npm start            # Start DHCP server

# Testing
cd Test && npm test             # Run all tests
cd Test && npm run test:perf    # Performance tests

# Documentation
cd Docs && npm run dev          # Serve docs locally
```

## Anti-Patterns (FORBIDDEN)

❌ Using `any` types
❌ Suggesting cloud/public deployment
❌ Ignoring performance targets (<5ms)
❌ Breaking backward compatibility
❌ Sequential operations when parallel possible
❌ Missing error handling in DNS query path
❌ Skipping documentation updates
❌ Hardcoded values (use constants/config)
❌ Exposing port 53 to public internet

## Workflow Guidelines

### When Adding Features
1. Read `ARCHITECTURE.md` to understand impact
2. Identify which layer(s) in 7-layer system are affected
3. Update `Rules.service.ts` or appropriate service
4. Add tests in `Test/` directory
5. Update documentation (README, ARCHITECTURE, FEATURES)
6. Build and verify performance targets
7. Test backward compatibility

### When Refactoring
1. Ensure all tests pass before changes
2. Refactor incrementally
3. Run tests after each change
4. Measure performance impact
5. Update architecture diagrams if flow changes

### When Fixing Bugs
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test now passes
4. Check for similar issues in codebase
5. Document the fix in commit message

## Success Criteria

Every task must meet ALL:
- ✅ Builds successfully (`npm run build` in affected module)
- ✅ Tests pass (`cd Test && npm test`)
- ✅ Performance targets met (<5ms for DB, <50ms for upstream)
- ✅ Documentation updated
- ✅ Backward compatible
- ✅ LAN-only usage emphasized
- ✅ No `any` types
- ✅ Proper error handling
