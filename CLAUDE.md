# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NexoralDNS** - Advanced DNS Management & Surveillance System for Local Area Networks (LAN).

- **Stack**: TypeScript (strict) → CommonJS, Node.js ≥18.0.0
- **Architecture**: 7-Layer DNS query processing, Multi-service microarchitecture
- **Performance**: Sub-5ms query response with Redis caching
- **Components**: DNS Server (UDP), Web Dashboard, DHCP Server, Message Broker

## Commands

```bash
# Server
cd server && npm run build    # TypeScript → lib/ (MANDATORY)
cd server && npm run dev       # Build + start dev mode
cd server && npm start         # Production mode (cluster)

# Web Dashboard
cd Web && npm run dev          # Development server
cd Web && npm run build        # Production build

# DHCP Server
cd DHCP && npm run build       # TypeScript → lib/
cd DHCP && npm start           # Start DHCP server

# Tests
cd Test && npm test            # Run all tests
```

## Core Rules (NON-NEGOTIABLE)

1. **ALWAYS build**: `npm run build` after EVERY code change in respective module
2. **ALWAYS test**: Add/update tests in `Test/` for ANY feature change
3. **NEVER incomplete**: Build passes + Tests pass + Docs updated = Done
4. **Respect architecture**: Follow 7-Layer DNS processing, read ARCHITECTURE.md first
5. **Performance first**: Sub-5ms target, optimize every query path
6. **Backward compatibility**: NO breaking changes without versioning

## Critical Constraints

### ⚠️ LAN-ONLY System
**NEVER suggest cloud deployment or public hosting**
- This is strictly for Local Area Network (LAN) use
- ISPs will block DNS spoofing on cloud/public networks
- Always emphasize local installation in documentation

### Performance Targets
- **Cache hit**: <2ms response time
- **DB lookup**: <5ms response time
- **Upstream DNS**: <50ms response time
- **Memory**: Efficient Redis caching, TTL management
- **CPU**: Cluster mode for multi-core utilization

## Architecture Overview

See `ARCHITECTURE.md` for complete details.

### 7-Layer DNS Query Processing
```
Layer 1: Cache (Redis) - 0.5-1ms
Layer 2: Service Status Check - 0.5ms
Layer 3: Block List Check - 0.5ms
Layer 4: Client Plan Validation - 1ms
Layer 5: Custom Records (DB) - 2ms
Layer 6: Domain Rerouting - 1ms
Layer 7: Upstream DNS Fallback - 20-50ms
```

### Module Structure
```
server/          # Main DNS server (TypeScript, Fastify)
├── src/
│   ├── core/           # DNS packet handler, Fastify server
│   ├── services/       # 7-layer processing logic
│   ├── database/       # MongoDB schemas & connections
│   └── cluster/        # Multi-process cluster mode

Web/             # Admin dashboard (React/Vite)
DHCP/            # DHCP server (TypeScript)
Broker/          # Message broker (future use)
client/          # Client SDK
Test/            # Test suites
Docs/            # Documentation site
```

## Key Patterns

### Strict TypeScript
```typescript
// ❌ NEVER
const result: any = await query();

// ✅ ALWAYS
interface DNSResponse {
  answers: DNSAnswer[];
  ttl: number;
  cached: boolean;
}
const result: DNSResponse = await query();
```

### Error Handling
```typescript
try {
  const response = await processQuery(query);
  return response;
} catch (error) {
  logger.error('Query failed', { error, query });
  return createNXDOMAIN(); // Graceful fallback
}
```

### Performance Optimization
```typescript
// ✅ Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ✅ Batch DB operations
const results = await Promise.all(domains.map(d => findRecord(d)));

// ❌ Sequential operations
for (const domain of domains) {
  await findRecord(domain); // SLOW
}
```

## SOLID Principles & Dependency Injection (MANDATORY)

All class-based code in `server/` and `Web/` MUST follow SOLID and use the DI container. Do NOT reintroduce class-level singletons (`getInstance()`) or `new XService()` in application code.

### SOLID
- **S**ingle Responsibility: one reason to change per class. Split god-classes into focused collaborators (see `Redis/`, `RabbitMQ/` managers).
- **O**pen/Closed: extend via new collaborators, don't rewrite existing ones.
- **L**iskov: collaborators implementing an interface must be substitutable.
- **I**nterface Segregation: keep interfaces small and focused (e.g. `ITokenExtractor`, `ISessionStore`).
- **D**ependency Inversion: depend on the DI container / abstractions, never construct concrete infra directly.

### DI Container Rules
1. **Register every service** in `appContainer.ts` as a singleton:
   ```typescript
   container.register('UsersService', () => new UsersService(), true);
   ```
2. **Services are stateless singletons**: empty `constructor() { }`, NO per-request fields (no stored `fastifyReply`).
3. **Pass request data as method parameters**, not constructor args:
   ```typescript
   // ✅ Controller resolves singleton, passes reply + data to the method
   const service = container.get<UsersService>('UsersService');
   await service.createUser(data, reply);

   // ❌ NEVER instantiate directly or store reply on the instance
   const service = new UsersService(reply);
   ```
4. **Fetch infra fresh on each call** (resilient to reconnects) — never cache a collection/client in a class field:
   ```typescript
   const usersCol = container.get<MongoCollectionManager>('MongoCollectionManager')
     .getCollection(DB_DEFAULT_CONFIGS.Collections.USERS);
   ```
5. **DI keys are strings** and invisible to `tsc` — the key in `container.get('X')` MUST exactly match the `register('X', ...)` key. After any DI change, diff registered vs used keys.
6. **Singletons take no per-call args** — `container.get(key, arg)` throws for singletons. Request data goes to methods.

### Correctly NOT in DI (leave as-is)
Per-request wrappers and pure utilities: `BuildResponse`, `Bcrypt`, `DNSPacketCodec`, `RequestControllerHelper`, `authGuard`/`PermissionGuard` (static middleware), socket IO handlers.

## Documentation Requirements

**Update when features change**:
1. **README.md** - Setup, usage, quick start
2. **ARCHITECTURE.md** - Flow diagrams, layer changes, schema updates
3. **FEATURES.md** - New feature descriptions
4. **JSDoc** - All public methods and complex logic

## Security

1. **Input Validation**: Validate all DNS queries, sanitize domain names
2. **Rate Limiting**: Prevent DNS amplification attacks
3. **Client Authentication**: Verify client plans and permissions
4. **No Public Exposure**: Always emphasize LAN-only usage

## Testing

- **Location**: `Test/` directory
- **Coverage**: DNS query processing, caching, rerouting, blocking
- **Performance**: Measure response times, ensure sub-5ms targets
- **Edge Cases**: Malformed queries, NXDOMAIN, upstream failures

## Workflow Guidelines

### When Adding Features
1. Read `ARCHITECTURE.md` to understand impact
2. Update appropriate layer in 7-layer processing
3. Add tests for new functionality
4. Update documentation (README, ARCHITECTURE, FEATURES)
5. Build and verify performance targets

### When Refactoring
1. Ensure backward compatibility
2. Run all tests before and after
3. Measure performance impact
4. Update architecture diagrams if flow changes

### When Fixing Bugs
1. Add test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Document the fix in commit message

## Anti-Patterns (FORBIDDEN)

❌ Using `any` types
❌ Suggesting cloud/public deployment
❌ Ignoring performance targets
❌ Breaking backward compatibility
❌ Skipping documentation updates
❌ Sequential operations when parallel is possible
❌ Missing error handling in DNS query path

## Success Criteria

Every task must meet ALL:
- ✅ Builds successfully in respective module
- ✅ Tests pass
- ✅ Performance targets met (<5ms for DB lookups)
- ✅ Documentation updated
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ LAN-only usage emphasized
