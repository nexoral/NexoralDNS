import CopyCodeBlock from "@/components/CopyCodeBlock";
import { FadeIn } from "@/components/MotionWrapper";

export default function Architecture() {
  return (
    <div className="px-6 py-12 lg:px-12">
      <FadeIn>
        <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
          <h1>System Architecture</h1>

          <p className="text-xl text-gray-400">
            Deep dive into NexoralDNS architecture, design patterns, and performance optimization strategies.
          </p>

          <h2>System Overview</h2>

          <p>
            NexoralDNS is a high-performance DNS server built with advanced features:
          </p>

          <ul>
            <li><strong>Sub-5ms query response times</strong> with Redis caching</li>
            <li><strong>Domain rerouting</strong> (e.g., google.com → ankan.site)</li>
            <li><strong>Domain blocking</strong> (ads, malware, custom blocks)</li>
            <li><strong>User plan management</strong> with feature limits</li>
            <li><strong>Analytics & logging</strong> for query monitoring</li>
            <li><strong>Multi-client support</strong> with client-specific rules</li>
          </ul>

          <h2>High-Level Architecture</h2>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 my-8">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {`┌─────────────────────────────────────────────────────────────────────┐
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
   Return <2ms           Return <5ms           Return <50ms`}
            </pre>
          </div>

          <h2>7-Layer Query Processing</h2>

          <p>
            Every DNS query passes through 7 optimization layers for maximum performance and functionality:
          </p>

          <h3>Layer 1: Redis Cache (0.5-1ms)</h3>
          <p>
            First check the Redis cache for previously resolved queries. This provides sub-millisecond responses
            for 80%+ of queries.
          </p>

          <h3>Layer 2: Service Status (0.5ms)</h3>
          <p>
            Verify the DNS service is active. If disabled, return NXDOMAIN immediately.
          </p>

          <h3>Layer 3: Block List (0.5ms)</h3>
          <p>
            Check if the domain is blocked (globally or for specific clients). Blocked domains return NXDOMAIN
            and are logged for analytics.
          </p>

          <h3>Layer 4: Rewrite Rules (1ms)</h3>
          <p>
            Check for domain rerouting rules. If a rewrite exists (e.g., google.com → ankan.site), resolve the
            target domain and return its IP.
          </p>

          <h3>Layer 5: DNS Record Lookup (2ms)</h3>
          <p>
            Query MongoDB for custom DNS records. This layer handles user-created domains like &quot;myapp.local&quot;.
          </p>

          <h3>Layer 6: User Plan Validation (0.5ms)</h3>
          <p>
            For custom domains, verify the user&apos;s subscription plan is active. Expired plans result in NXDOMAIN.
          </p>

          <h3>Layer 7: Upstream DNS (10-50ms)</h3>
          <p>
            If no match is found in previous layers, forward to upstream DNS servers (8.8.8.8, 1.1.1.1) and
            cache the response.
          </p>

          <h2>Component Breakdown</h2>

          <h3>1. Client Layer</h3>
          <ul>
            <li><strong>Web UI (Next.js):</strong> User dashboard for managing DNS records</li>
            <li><strong>Mobile App:</strong> Mobile client for DNS management</li>
            <li><strong>CLI Client:</strong> Command-line interface</li>
            <li><strong>DNS Clients:</strong> Any device using the DNS server</li>
          </ul>

          <h3>2. API Server Layer (Port 4000 - Fastify)</h3>
          <ul>
            <li><strong>REST API:</strong> HTTP endpoints for CRUD operations</li>
            <li><strong>Controllers:</strong> Request validation and routing</li>
            <li><strong>Services:</strong> Business logic and database operations</li>
            <li><strong>Authentication:</strong> JWT-based user authentication</li>
          </ul>

          <h3>3. DNS Server Layer (Port 53 - UDP)</h3>
          <ul>
            <li><strong>DNS.Service.ts:</strong> Main UDP server on port 53</li>
            <li><strong>Rules.service.ts:</strong> Core query processing with 7-layer checks</li>
            <li><strong>Supporting Services:</strong> Database lookups, caching, logging</li>
            <li><strong>Global DNS Forwarder:</strong> Upstream DNS resolution</li>
          </ul>

          <h3>4. Caching Layer (Redis)</h3>
          <p>
            Redis provides sub-millisecond query responses with the following cache types:
          </p>
          <ul>
            <li>Full DNS responses (binary packets)</li>
            <li>DNS records (JSON)</li>
            <li>Service status</li>
            <li>Rewrite rules</li>
            <li>Block lists</li>
            <li>User plans</li>
          </ul>

          <h3>5. Database Layer (MongoDB)</h3>
          <p>
            Collections:
          </p>
          <ul>
            <li><code>dns_records</code> - A, AAAA, CNAME records</li>
            <li><code>dns_rewrites</code> - Domain rerouting rules</li>
            <li><code>dns_blocks</code> - Blocked domains</li>
            <li><code>user_plans</code> - Subscription management</li>
            <li><code>dns_query_logs</code> - Analytics data (30-day TTL)</li>
            <li><code>domains</code> - User-owned domains</li>
            <li><code>service</code> - Service configuration</li>
          </ul>

          <h2>Database Schema</h2>

          <h3>DNS Rewrites (Domain Rerouting)</h3>
          <CopyCodeBlock
            language="typescript"
            code={`{
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
}`}
          />

          <h3>DNS Blocks</h3>
          <CopyCodeBlock
            language="typescript"
            code={`{
  _id: ObjectId,
  userId: ObjectId | null,           // null = global block
  domain: "ads.google.com",
  blockType: "exact" | "wildcard",   // exact or *.domain.com
  applyToClients: ["192.168.1.10"],  // [] = all clients
  enabled: true,
  reason: "Malware" | "Ads" | "Custom",
  createdAt: Date
}`}
          />

          <h3>User Plans</h3>
          <CopyCodeBlock
            language="typescript"
            code={`{
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
}`}
          />

          <h2>Performance Targets</h2>

          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Target Latency</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Redis Cache Hit</td>
                <td><strong>0.5-1ms</strong></td>
                <td>80%+ hit rate expected</td>
              </tr>
              <tr>
                <td>Service Status</td>
                <td><strong>0.5ms</strong></td>
                <td>Cached in Redis</td>
              </tr>
              <tr>
                <td>Block Check</td>
                <td><strong>0.5ms</strong></td>
                <td>Redis SET lookup</td>
              </tr>
              <tr>
                <td>Rewrite Check</td>
                <td><strong>1ms</strong></td>
                <td>Redis + fallback DB</td>
              </tr>
              <tr>
                <td>DNS Record DB</td>
                <td><strong>2-3ms</strong></td>
                <td>Redis + MongoDB</td>
              </tr>
              <tr>
                <td>User Plan Check</td>
                <td><strong>0.5ms</strong></td>
                <td>Cached in Redis</td>
              </tr>
              <tr>
                <td>Upstream DNS</td>
                <td><strong>10-50ms</strong></td>
                <td>Only for uncached</td>
              </tr>
              <tr>
                <td><strong>Total (Cached)</strong></td>
                <td><strong>&lt;2ms</strong></td>
                <td>🎯 Target</td>
              </tr>
              <tr>
                <td><strong>Total (Uncached DB)</strong></td>
                <td><strong>&lt;5ms</strong></td>
                <td>🎯 Target</td>
              </tr>
              <tr>
                <td><strong>Total (Upstream)</strong></td>
                <td><strong>&lt;50ms</strong></td>
                <td>Acceptable</td>
              </tr>
            </tbody>
          </table>

          <h2>Redis Caching Strategy</h2>

          <h3>Cache Key Structure</h3>
          <CopyCodeBlock
            language="typescript"
            code={`// Service Status (TTL: 60s)
redis.set('service:status', 'active', 'EX', 60)

// DNS Records (TTL: 300s or record TTL)
redis.set('dns:google.com', '{"value":"1.2.3.4","ttl":300}', 'EX', 300)

// Rewrites (TTL: 300s)
redis.set('rewrite:google.com:192.168.1.5', '{"target":"ankan.site"}', 'EX', 300)

// Blocks (TTL: 600s)
redis.sadd('block:global', 'ads.google.com')

// User Plans (TTL: 300s)
redis.set('plan:userId:507f1f77bcf86cd799439011', '{"status":"active"}', 'EX', 300)`}
          />

          <h2>Technology Stack</h2>

          <ul>
            <li><strong>Runtime:</strong> Node.js (TypeScript)</li>
            <li><strong>DNS Server:</strong> Native UDP server (dgram)</li>
            <li><strong>API Server:</strong> Fastify</li>
            <li><strong>Database:</strong> MongoDB</li>
            <li><strong>Cache:</strong> Redis</li>
            <li><strong>Web UI:</strong> Next.js + React</li>
            <li><strong>Deployment:</strong> Docker + Docker Compose</li>
          </ul>

          <h2>Scalability & High Availability</h2>

          <h3>Redis Cluster</h3>
          <p>
            Master-Replica setup for failover protection and high availability.
          </p>

          <h3>MongoDB Replica Set</h3>
          <p>
            3-node replica set for data redundancy and automatic failover.
          </p>

          <h3>DNS Service Clustering</h3>
          <p>
            Use PM2 cluster mode to run multiple DNS server instances sharing the same Redis cache.
          </p>

          <h2>Security Considerations</h2>

          <ul>
            <li><strong>Redis Security:</strong> Password authentication, localhost binding, TLS for remote</li>
            <li><strong>Rate Limiting:</strong> Per-IP query limits, DDoS protection</li>
            <li><strong>Input Validation:</strong> Sanitized domain names, prevent DNS amplification</li>
            <li><strong>Access Control:</strong> JWT authentication, role-based access</li>
          </ul>

          <h2>Monitoring & Metrics</h2>

          <p>
            Key metrics to track:
          </p>

          <ul>
            <li>Cache hit rate (target: &gt;80%)</li>
            <li>P50, P95, P99 latency</li>
            <li>Queries per second</li>
            <li>Error rate</li>
            <li>Database query time</li>
            <li>Redis memory usage</li>
          </ul>

          <h2>Learn More</h2>

          <ul>
            <li><a href="/docs/api">API Reference</a> - REST API endpoints</li>
            <li><a href="/docs/features">Features</a> - Detailed feature documentation</li>
            <li><a href="/docs/security">Security</a> - Security best practices</li>
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}
