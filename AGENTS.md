# AGENTS.md

OpenAI Codex CLI Instructions for NexoralDNS

## Project Overview

**NexoralDNS** - Advanced DNS Management & Surveillance System

- **Type**: DNS Server with Web Dashboard
- **Language**: TypeScript → CommonJS
- **Runtime**: Node.js ≥18.0.0
- **Architecture**: 7-Layer DNS query processing
- **Performance**: Sub-5ms response with Redis caching
- **Deployment**: LAN-ONLY (never cloud/public)

## Core Principles

### 1. Performance First
Sub-5ms DNS query response time is critical:
- Cache hit: <2ms
- DB lookup: <5ms
- Optimize every query path

### 2. Backward Compatibility
- No breaking changes without versioning
- Graceful degradation for new features
- Test compatibility thoroughly

### 3. LAN-Only Deployment
**CRITICAL**: Never suggest cloud/public hosting
- ISPs block DNS spoofing
- System designed for local networks only

## Build Commands

```bash
# Server
cd server && npm run build    # Compile TypeScript
cd server && npm run dev       # Dev mode
cd server && npm start         # Production (cluster)

# Web Dashboard
cd Web && npm run build        # Production build
cd Web && npm run dev          # Dev server

# Tests
cd Test && npm test            # Run all tests
```

## Architecture

### 7-Layer Processing
1. **Cache** (Redis) - 0.5-1ms
2. **Service Status** - 0.5ms
3. **Block List** - 0.5ms
4. **Client Plan** - 1ms
5. **Custom Records** (MongoDB) - 2ms
6. **Domain Rerouting** - 1ms
7. **Upstream DNS** - 20-50ms

### Module Structure
```
server/src/
  ├── core/           # DNS packet handler, Fastify
  ├── services/       # 7-layer logic
  ├── database/       # MongoDB schemas
  └── cluster/        # Multi-process

Web/                  # React dashboard
DHCP/                 # DHCP server
Test/                 # Tests
```

## TypeScript Standards

### No `any` Types
```typescript
// ✅ GOOD
interface DNSResponse {
  answers: DNSAnswer[];
  ttl: number;
  cached: boolean;
}

// ❌ BAD
const response: any = await query();
```

### Error Handling
```typescript
try {
  return await processQuery(query);
} catch (error) {
  logger.error('Query failed', { error, query });
  return createNXDOMAIN();
}
```

## SOLID & Dependency Injection (MANDATORY)

All class-based code in `server/` and `Web/` must follow SOLID and use the DI container. No `getInstance()` singletons, no `new XService()` in app code.

### SOLID
- **S**RP: one responsibility per class; split god-classes into focused collaborators.
- **O**CP: extend via new collaborators, don't rewrite.
- **L**SP: interface implementations must be substitutable.
- **I**SP: small, focused interfaces.
- **D**IP: depend on the DI container / abstractions, not concrete infra.

### DI Rules
```typescript
// ✅ Register as singleton in appContainer.ts
container.register('UsersService', () => new UsersService(), true);

// ✅ Resolve singleton, pass reply + data to the method
const service = container.get<UsersService>('UsersService');
await service.createUser(data, reply);

// ❌ Never store reply on the instance / instantiate directly
const service = new UsersService(reply);
```
- Services are **stateless singletons**: empty `constructor() { }`, no per-request fields.
- Pass request data (reply, params) as **method arguments**.
- Fetch DB/Redis/RabbitMQ **fresh on each call** via the container (reconnect-safe); never cache clients in fields.
- DI keys are strings, unchecked by `tsc` — `container.get('X')` must exactly match `register('X', ...)`.
- Singletons reject per-call args; request data goes to methods.

**Correctly NOT in DI**: `BuildResponse`, `Bcrypt`, `DNSPacketCodec`, `RequestControllerHelper`, static middleware (`authGuard`, `PermissionGuard`), socket IO handlers.

## Performance

### Cache First
```typescript
// ✅ Check Redis before DB
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### Parallel Operations
```typescript
// ✅ Parallel
await Promise.all(domains.map(d => findRecord(d)));

// ❌ Sequential (slow)
for (const d of domains) await findRecord(d);
```

## Documentation

Update when features change:
- `README.md` - Setup, usage, quick start
- `ARCHITECTURE.md` - Flow diagrams, layer changes
- `FEATURES.md` - New feature descriptions
- JSDoc for public methods

## Security

- Validate DNS queries
- Rate limiting
- Client authentication
- LAN-only deployment

## Testing

- Location: `Test/` directory
- Coverage: Query processing, caching, rerouting
- Performance: Verify sub-5ms targets
- Edge cases: Malformed queries, failures

## Anti-Patterns

❌ Using `any` types
❌ Suggesting cloud deployment
❌ Ignoring performance targets
❌ Breaking backward compatibility
❌ Skipping documentation
❌ Sequential operations when parallel possible
❌ `getInstance()` singletons or `new XService()` in app code (use DI container)
❌ Storing `reply`/request state on service instances (pass as method args)

## Success Criteria

- ✅ Builds successfully
- ✅ Tests pass
- ✅ Performance <5ms
- ✅ Docs updated
- ✅ Backward compatible
- ✅ LAN-only emphasized
