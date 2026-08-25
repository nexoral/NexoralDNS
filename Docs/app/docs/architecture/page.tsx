import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'System overview' },
  { type: 'list', variant: 'dot', items: [
    'Sub-5ms query response with Redis caching',
    'Domain rerouting (e.g. google.com → ankan.site)',
    'Domain blocking for ads, malware and custom rules',
    'User plan management with feature limits',
    'Analytics & logging for query monitoring',
    'Multi-client support with client-specific rules',
  ]},
  { type: 'h', title: '7-layer query processing', sub: 'Every query flows through the same pipeline regardless of transport (UDP, TCP, TLS).' },
  { type: 'steps', steps: [
    { title: 'Redis Cache — 0.5–1ms',        text: 'Check Redis for previously resolved queries. Sub-millisecond responses for 80%+ of traffic.' },
    { title: 'Service Status — 0.5ms',       text: 'Verify DNS service is active. If disabled, return NXDOMAIN immediately.' },
    { title: 'Block List — 0.5ms',           text: 'Check global or client-specific blocks. Blocked domains return NXDOMAIN and are logged.' },
    { title: 'Rewrite Rules — 1ms',          text: 'Check domain rerouting rules, resolve the target domain, return its IP.' },
    { title: 'DNS Record Lookup — 2ms',      text: 'Query MongoDB for custom records like myapp.local.' },
    { title: 'User Plan Validation — 0.5ms', text: 'For custom domains, verify the subscription plan is active. Expired plans return NXDOMAIN.' },
    { title: 'Upstream DNS — 10–50ms',       text: 'If no match, forward to 8.8.8.8 / 1.1.1.1 and cache the response.' },
  ]},
  { type: 'h', title: 'Component breakdown' },
  { type: 'cards', cols: 3, items: [
    { icon: '🖥️', title: 'Client Layer',              desc: 'Web UI (Next.js), mobile app, CLI client, and any device using the DNS server.' },
    { icon: '⚡', title: 'API Server (Fastify, :4000)', desc: 'REST endpoints, controllers, services, and JWT authentication.' },
    { icon: '🌐', title: 'DNS Server (:53 UDP/TCP, :853 TLS)', desc: 'A Go binary. server/udp.go, tcp.go and dot.go share the dnsio.Handler contract and dispatch into one rules pipeline.' },
    { icon: '🛒', title: 'Caching Layer (Redis)',      desc: 'Full responses, records, service status, rewrites, block lists and user plans.' },
    { icon: '🗄️', title: 'Database (MongoDB)',          desc: 'dns_records, dns_rewrites, dns_blocks, user_plans, dns_query_logs (30-day TTL), domains, service.' },
    { icon: '🔁', title: 'Global Forwarder',           desc: 'Upstream DNS resolution with single-flight inflight de-duplication.' },
  ]},
  { type: 'h', title: 'Performance targets', sub: 'Per-stage budgets the design aims for. These are goals — see the measured load test below for numbers that were actually recorded.' },
  { type: 'table', grid: '1.2fr 1.4fr', head: ['Stage', 'Target'], rows: [
    { key: 'Redis Cache Hit',    cells: ['0.5–1ms (80%+ hit rate)'] },
    { key: 'Block Check',        cells: ['0.5ms (Redis SET lookup)'] },
    { key: 'Rewrite Check',      cells: ['1ms (Redis + DB fallback)'] },
    { key: 'DNS Record DB',      cells: ['2–3ms (Redis + MongoDB)'] },
    { key: 'Upstream DNS',       cells: ['10–50ms (uncached only)'] },
    { key: 'Total (Cached)',     cells: ['🎯 <2ms'] },
    { key: 'Total (Uncached)',   cells: ['🎯 <5ms'] },
  ]},
  { type: 'h', title: 'Measured load test', sub: 'dnsperf against the Go engine over UDP:53 — 49 domains, warm cache. Everything, including the load generator, ran on one machine.' },
  { type: 'table', grid: '1.6fr 1fr 1fr 1fr', head: ['Load shape', 'QPS', 'Avg latency', 'Lost'], rows: [
    { key: '5 clients, 50 in flight',    cells: ['12,746', '3.8ms', '0'] },
    { key: '8 threads, 2000 in flight',  cells: ['10,396', '189ms', '95 (0.03%)'] },
  ]},
  { type: 'kv', items: [
    { k: 'CPU',        v: 'AMD Ryzen 5 5500U — 6 cores / 12 threads, x86_64' },
    { k: 'RAM',        v: '7.1 GiB' },
    { k: 'OS',         v: 'Linux 6.8 · Docker host networking · no container CPU limit' },
    { k: 'Transport',  v: 'UDP:53 over loopback — no NIC in the path' },
    { k: 'Co-located', v: 'MongoDB, Redis, RabbitMQ and dnsperf itself' },
  ]},
  { type: 'callout', tone: 'tip', title: 'Why the gentler run wins',
    text: 'At 2000 in flight the load generator competes with the server for the same 12 threads, and the deep queue adds wait time Little’s Law predicts almost exactly (2000 ÷ 10,396 ≈ 192ms) — that run measures the queue, not the server. Because the generator is co-located, 12,746 is a floor rather than the engine’s ceiling.' },
  { type: 'h', title: 'Redis cache key structure' },
  { type: 'code', prompt: false, label: 'redis keys', code: `service:status            → 'active'        EX 60
dns:google.com            → {"value":"1.2.3.4","ttl":300}  EX 300
rewrite:google.com:ip     → {"target":"ankan.site"}        EX 300
block:global (SADD)       → ads.google.com
plan:userId:507f…         → {"status":"active"}             EX 300` },
  { type: 'h', title: 'Technology stack' },
  { type: 'kv', items: [
    { k: 'DNS Engine', v: 'Go (single process, SO_REUSEPORT listeners)' },
    { k: 'API / DHCP',  v: 'Node.js (TypeScript, strict, CommonJS)' },
    { k: 'DNS Server', v: 'Native UDP/TCP/TLS (net, crypto/tls)' },
    { k: 'API Server', v: 'Fastify' },
    { k: 'Database',   v: 'MongoDB (3-node replica set)' },
    { k: 'Cache',      v: 'Redis (master-replica)' },
    { k: 'Web UI',     v: 'Next.js + React' },
    { k: 'Deployment', v: 'Docker + Docker Compose; PM2 for the Node services, the DNS binary runs from the entrypoint' },
  ]},
  { type: 'h', title: 'Security' },
  { type: 'list', variant: 'check', items: [
    'Redis password auth, localhost binding, TLS for remote',
    'Per-IP query rate limiting and DDoS protection',
    'Sanitized domain input prevents DNS amplification',
    'JWT authentication with role-based access control',
  ]},
];

export default function Architecture() {
  return (
    <DocPage
      group="Reference"
      title="System Architecture"
      intro="A deep technical dive into the NexoralDNS internal design, the 7-layer query engine, and its performance optimizations."
      blocks={blocks}
    />
  );
}
