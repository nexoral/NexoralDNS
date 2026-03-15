# GEMINI.md

This file provides guidance to Gemini Code Assist when working with code in this repository.

## Project Overview

**NexoralDNS** - Advanced DNS Management & Surveillance System for LAN

- **Stack**: TypeScript (strict) → CommonJS, Node.js ≥18.0.0
- **Architecture**: 7-Layer DNS processing, Multi-service microarchitecture
- **Performance**: Sub-5ms response time with Redis caching
- **Components**: DNS Server, Web Dashboard, DHCP Server, Message Broker

## Commands

```bash
# Build & Run
cd server && npm run build     # Compile TypeScript
cd server && npm run dev       # Development mode
cd Web && npm run dev          # Start dashboard

# Tests
cd Test && npm test            # Run tests
```

## Core Rules (NON-NEGOTIABLE)

1. **ALWAYS build**: `npm run build` after code changes
2. **ALWAYS test**: Update `Test/` for feature changes
3. **NEVER incomplete**: Build + Tests + Docs = Done
4. **Performance first**: Sub-5ms DNS response target
5. **Backward compatibility**: No breaking changes
6. **LAN-only**: Never suggest cloud/public deployment

## Critical Constraints

### ⚠️ LAN-ONLY System
**This is strictly for Local Area Networks**
- ISPs block DNS spoofing on cloud/public networks
- Always emphasize local installation only

### Performance Targets
- Cache hit: <2ms
- DB lookup: <5ms
- Upstream DNS: <50ms

## Architecture

### 7-Layer DNS Processing
```
1. Cache (Redis) - 0.5-1ms
2. Service Status - 0.5ms
3. Block List - 0.5ms
4. Client Plan - 1ms
5. Custom Records - 2ms
6. Domain Rerouting - 1ms
7. Upstream DNS - 20-50ms
```

### Structure
```
server/          # DNS server (Fastify, TypeScript)
  src/
    core/        # DNS packet handler
    services/    # 7-layer processing
    database/    # MongoDB schemas
    cluster/     # Multi-process mode

Web/             # React admin dashboard
DHCP/            # DHCP server
Test/            # Test suites
```

## TypeScript Standards

```typescript
// ✅ GOOD
interface DNSQuery {
  domain: string;
  type: 'A' | 'AAAA' | 'CNAME';
  clientIP: string;
}

// ❌ BAD
const query: any = parseQuery();
```

## Performance Optimization

```typescript
// ✅ Cache first
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);

// ✅ Parallel operations
await Promise.all(domains.map(findRecord));

// ❌ Sequential (slow)
for (const d of domains) await findRecord(d);
```

## Documentation Requirements

Update when features change:
- `README.md` - Setup, usage
- `ARCHITECTURE.md` - Flow diagrams, layers
- `FEATURES.md` - New features
- JSDoc for complex logic

## Security

- Validate all DNS queries
- Rate limiting for amplification attacks
- Client authentication
- LAN-only deployment

## Definition of "Done"

- ✅ Code follows standards
- ✅ `npm run build` passes
- ✅ Tests updated in `Test/`
- ✅ Performance targets met (<5ms)
- ✅ Docs updated
- ✅ Backward compatible
- ✅ LAN-only usage emphasized
