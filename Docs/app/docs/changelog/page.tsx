import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'timeline', versions: [
    {
      ver: 'v8.21.64-stable', date: 'August 1, 2026', tag: 'LATEST',
      changes: [
        ['New',      'The core DNS server was rewritten in Go. UDP:53, TCP:53 and DoT:853 all behave as before — same 7-layer pipeline, same fail-safe bypass, same wildcard blocking, same circuit breakers, same upstream list'],
        ['Improved', 'Multi-core work no longer needs cluster.fork(). One process opens a UDP listener per 75% of CPU cores, all sharing port 53 via SO_REUSEPORT, and the kernel spreads datagrams across them. Every query is handled on its own goroutine'],
        ['Improved', 'A malformed packet can no longer take down the server. Each query is isolated, so a panic costs exactly one query instead of every listener in the process — the old cluster model dropped every in-flight query on the affected worker'],
        ['Improved', 'Measured 12,746 queries/second at 3.8 ms average latency on a consumer laptop, with the load generator running on the same machine and zero dropped queries'],
        ['Fixed',    'Analytics were reaching MongoDB at roughly one record every two seconds while hundreds of thousands queued up behind them. Every consumer shared a single AMQP channel, and prefetch is a channel-level setting, so a consumer asking for 1 silently capped the analytics batch consumer that had asked for 1000. Each consumer now opens its own channel'],
        ['Fixed',    'A consumer whose channel closed stopped receiving for good — reconnecting the connection did not help, because the consumer was still bound to the dead channel. Consumers now reattach automatically'],
        ['Fixed',    'The analytics batch job resolved its MongoDB collection once at startup. If the database was not up yet, that handle stayed empty for the process lifetime and every batch was requeued forever. It is now resolved per batch, with insert errors caught and reported'],
        ['Fixed',    'A DNS answer built for a non-IPv4 value emitted a shorter rdata field than its own length header declared, producing a malformed packet. Such values now fall back to 0.0.0.0'],
        ['Improved', 'The per-query log line moved from info to debug, and the per-publish broker log was removed. At production query rates those two lines were the single most expensive thing on the request path, since every write serialises through one lock. Set LOG_LEVEL=debug to bring the query log back'],
        ['Improved', 'The service on/off check is remembered in memory for 5 seconds instead of hitting Redis on every single query. A policy change still takes effect immediately, because the broadcast clears the memo'],
        ['Improved', 'DNS-over-TLS certificates are generated in-process with crypto/x509 instead of shelling out to the openssl binary, and are written atomically through a uniquely-named temp file so a stale or pre-planted file can never leave the private key world-readable'],
        ['Improved', 'The dependency graph is wired once at startup and checked by the compiler, replacing the string-keyed DI container — a mis-wired dependency is now a build error instead of a crash on the first query that needs it'],
      ],
    },
    {
      ver: 'v6.12.53-stable', date: 'July 6, 2026',
      changes: [
        ['Improved', 'All console.log/console.error replaced with pino async structured logging — synchronous I/O eliminated from every hot path, event loop no longer blocked by logging'],
        ['Improved', 'MongoDB timeouts configured (connectTimeoutMS: 5s, serverSelectionTimeoutMS: 5s, socketTimeoutMS: 30s) — stuck connections no longer accumulate under load'],
        ['Improved', 'Fastify requestTimeout set to 30s — slow clients can no longer exhaust the worker pool'],
        ['Improved', 'Redis KEYS command replaced with SCAN cursor iteration — O(N) blocking Redis operation eliminated from cache invalidation'],
        ['Improved', 'DNS query processing now has a 5-second timeout guard — hanging DB/RabbitMQ calls no longer leave clients waiting indefinitely; SERVFAIL returned on timeout'],
        ['New',      'Pre-allocated dgram socket pool (256 sockets) for upstream DNS forwarding — eliminates create/destroy syscall overhead per query'],
        ['Fixed',    'Socket listener collision in forwarder pool — per-query socket.on("message") listeners could cross-wire responses when multiple queries shared a socket; replaced with single permanent listener dispatching by DNS TXID'],
        ['Improved', 'Upstream DNS analytics publish moved off the response path — fire-and-forget, no longer awaits RabbitMQ before sending answer to client'],
        ['New',      'Circuit breaker for each upstream DNS server — 5 failures in 30s opens the breaker; dead servers skipped in ~0ms instead of waiting 2s per attempt; auto-recovery probe after 30s cooldown'],
        ['Improved', 'Upstream DNS server status (breaker state + failure count) exposed in forwarder status endpoint'],
      ],
    },
    {
      ver: 'v6.11.53-stable', date: 'July 6, 2026',
      changes: [
        ['Fixed',    'A malformed or truncated DNS packet — e.g. a self-referential compression pointer — could spin a worker’s event loop forever, so a single crafted UDP datagram from any LAN client could take down DNS for everyone pinned to that worker; the parser now bounds every label walk and caps compression-pointer jumps'],
        ['Fixed',    'API error responses were being sent with HTTP 200 (the real code appeared only in the JSON body) — failed logins, not-found, and conflicts now return their correct HTTP status, so browsers, proxies and the dashboard interpret them properly'],
        ['Fixed',    'DNS record update and delete were scoped only by record id, letting one user modify or delete another user’s records by guessing the id; both now enforce domain ownership'],
        ['Fixed',    'Wildcard block rules over-matched — *.facebook.com also blocked notfacebook.com and evil-facebook.com; wildcard matching now respects label boundaries and blocks the domain plus its subdomains only'],
        ['Fixed',    'Upstream responses with TTL 0 were cached permanently instead of not cached, defeating instant block/unblock toggling and serving stale records indefinitely'],
        ['Fixed',    'The DoT (DNS-over-TLS) certificate could be generated by several cluster workers at once and persist a mismatched cert/key pair; it is now generated once by the cluster primary before forking, with atomic writes'],
        ['Fixed',    'The IP-change watcher could write "nameserver 0.0.0.0" into /etc/resolv.conf on a transient interface blip and break host DNS; unreliable readings are now ignored and resolv.conf is written atomically (and it no longer corrupts the search directive)'],
        ['Fixed',    'The IP-change watcher’s Redis client permanently stopped reconnecting after 10 attempts, silently dropping all later IP-change events; it now retries indefinitely with capped backoff'],
        ['Fixed',    'Granular DNS permissions were unusable — the list route required a delete permission and the delete route required a non-existent permission code; added the missing "View DNS Record" permission and corrected the route mappings so only Full Access no longer works'],
        ['Fixed',    'Authorization: Bearer <token> headers were not stripped of the scheme prefix before verification'],
        ['Fixed',    'DNS record cache invalidation is now consistent across add/update/delete (keyed by record name) and awaited, so edits take effect reliably'],
        ['Improved', 'The JWT signing secret is now a persisted random 256-bit key generated on first boot, replacing a low-entropy machine-derived secret — existing sessions are invalidated once on upgrade and users must sign in again'],
        ['Improved', 'DNS analytics publishing moved fully off the response path — a RabbitMQ outage no longer delays DNS answers, and broker reconnection runs in the background'],
        ['Improved', 'Access-control lookups now use O(1) exact-match membership plus a small wildcard scan instead of scanning the entire blocklist on every query'],
        ['Improved', 'Cache-admin key enumeration uses Redis SCAN instead of the blocking KEYS command'],
        ['Improved', 'Mongo collection handles are resolved fresh per call, so a database reconnect no longer leaves services holding a dead client'],
      ],
    },
    {
      ver: 'v5.8.48-stable', date: 'July 4, 2026',
      changes: [
        ['New',      'Added automatic CLI packaging (.deb and .tar.gz) for amd64, arm64, and i386 architectures, published automatically to GitHub Releases on push.'],
        ['New',      'Added self-updating CLI feature via nexoraldns pack command to fetch, download, and install latest package releases directly.'],
        ['Improved', 'Simplified CLI commands; after the first curl installation, users can manage all NexoralDNS services via direct nexoraldns start/stop/update/remove commands.'],
        ['New',      'Added automatic package registration to the installer, automatically downloading and installing the Debian package on initial deployment.'],
        ['Fixed',    'Completely uninstalls the CLI package and cleans up commands during the remove flow.'],
      ],
    },
    {
      ver: 'v5.8.47-stable', date: 'July 2, 2026',
      changes: [
        ['Fixed',    'Upstream DNS forwarding no longer shares one socket across concurrent queries — a burst of many simultaneous lookups (e.g. one page load) was silently dropping most of them; traced to socket contention (verified: 20 concurrent queries through one shared socket lost 19, while giving each its own socket lost none, repeatably)'],
        ['Improved', 'Each forwarded query now uses its own short-lived socket instead of a shared singleton, removing the transaction-ID rewriting and pending-request tracking the old design needed to disambiguate concurrent queries'],
        ['New',      'Concurrent upstream forwards capped at 256 in-flight at once, queueing beyond that, so a large burst can no longer exhaust the process’s file descriptor limit'],
        ['Improved', 'Upstream DNS provider list trimmed from 14 servers to 6 (Cloudflare, Google, Quad9 unfiltered) — dropped Verisign, OpenDNS (applies its own filtering even on "standard" tier), and 4x legacy Level3/CenturyLink IPs of uncertain reliability; cuts worst-case forwarding time from 28s to 12s'],
        ['New',      'GitHub Actions workflow now detects whether a push only touched Docs/Markdown/.github/.claude files and skips the Docker build entirely for those, with a build-summary annotation either way (image size, digest, layer count on real builds)'],
        ['Improved', 'Docs site version badge and install-command URLs are now server-rendered from GitHub’s live API (VERSION file, README.md) instead of hand-copied, cached 12h server-side and shared across all visitors'],
      ],
    },
    {
      ver: 'v5.7.46-stable', date: 'July 2, 2026',
      changes: [
        ['Improved', 'MongoDB connection pool size now scales with CPU count instead of a flat driver default — floor of 20, ceiling of 50 per worker, targeting ~200 aggregate connections across the cluster'],
        ['Fixed',    'UDP socket buffer resizing now runs only after the socket confirms it is bound; previously threw silently and never applied, including in the upstream DNS forwarder'],
        ['New',      'Docker entrypoint raises the OS-level UDP buffer ceiling (net.core.rmem_max/wmem_max) at container start so the buffer resize above actually takes effect'],
        ['Fixed',    'RabbitMQ queue declarations were being re-asserted on every publish/consume call; now memoized once per queue per process, fixing an argument mismatch between publisher and consumer declarations along the way'],
        ['Fixed',    'Removed a stray debug log firing on every cache-miss DNS lookup'],
        ['Improved', 'Architecture documentation rewritten to match the current implementation'],
      ],
    },
    {
      ver: 'v4.7.46-stable', date: 'July 2, 2026',
      changes: [
        ['New',      'DNS query status handling now includes fail-safe options — queries keep resolving via cache or upstream even if MongoDB is temporarily unreachable'],
        ['New',      'Health check service reports MongoDB, Redis, and RabbitMQ status'],
        ['Improved', 'Cron job execution integrated into cluster master and Fastify server startup'],
        ['Improved', 'RabbitMQ consumer batch size and timeout tuned for analytics processing'],
        ['Improved', 'MongoDB connection initialization cleaned up, index creation syntax improved'],
        ['Improved', 'Dockerfile and ecosystem config updated for service management; MongoDB connection initialization added to cluster setup'],
      ],
    },
    {
      ver: 'v4.6.45-stable', date: 'July 2, 2026',
      changes: [
        ['New',      'Log export functionality with async processing and cleanup'],
        ['New',      'Anti-AI Mode — domain filtering for AI tools, joining Anti-Porn and Anti-Ads modes'],
        ['New',      'User and role management routes and services (RBAC dashboard)'],
        ['Improved', 'Permission handling for domain and user management features'],
      ],
    },
    {
      ver: 'v3.6.45-stable', date: 'July 2, 2026',
      changes: [
        ['Improved', 'Docs site rewritten, with a new achievements section on the homepage'],
        ['Improved', 'UI components refactored for styling and consistency; layout and responsiveness enhanced'],
        ['Refactor', 'Removed unused TCP broker and event mapping code'],
      ],
    },
    {
      ver: 'v3.5.44-stable', date: 'June 20, 2026',
      changes: [
        ['New',      'DNS over TCP (port 53) — RFC 1035 §4.2.2 / RFC 7766; 2-byte length-prefix framing, 30s idle timeout'],
        ['New',      'DNS over TLS / DoT (port 853) — RFC 7858; TLS 1.2+ enforced, self-signed cert auto-generated via openssl'],
        ['New',      'IDNSIOHandler interface — unified IO contract so UDP, TCP and TLS share one 7-layer pipeline'],
        ['Improved', 'StartRulesService refactored to singleton per transport with shared single-flight inflight map'],
        ['Improved', 'Static Redis subscription guard prevents duplicate cache:invalidate listeners in cluster mode'],
        ['Improved', 'TLS cert persisted to /etc/nexoral/cert — shared across restarts and cluster workers'],
        ['Improved', 'Authentication — removed Authorization header requirement from DNS and Domains routes'],
        ['Improved', 'Session management — auto-expiration for inactive sessions, rotating refresh tokens'],
        ['Improved', 'Redis caching for session management'],
        ['Improved', 'Broker service removed from ecosystem (consolidated into main server)'],
      ],
    },
    {
      ver: 'v3.4.43-stable', date: 'March 15, 2026',
      changes: [
        ['Improved', 'Added comprehensive documentation and project guidelines'],
        ['Improved', 'Cleaned up model configuration in settings.json'],
      ],
    },
    {
      ver: 'v3.4.42-stable', date: 'February 16, 2026',
      changes: [
        ['New',      'Anti-Porn and Anti-Ads block modes with curated domain lists'],
        ['New',      'BlockDeviceModal — block devices by domain-based policies'],
        ['Improved', 'Redis cache invalidation for ACL and service status updates'],
        ['Improved', 'BlockList service refactored for stateless operation'],
      ],
    },
    {
      ver: 'v3.3.38-stable', date: 'January 4, 2026',
      changes: [
        ['New',      'Wildcard domain support in Access Control (e.g. *.ads.com)'],
        ['New',      'Cron job to load Access Control policies into Redis on startup'],
        ['New',      'IP Groups and Policies management in the dashboard'],
        ['Improved', 'ACL caching with new Redis keys for blocked domains'],
        ['Improved', 'BlockList service — checkDomain method with domain logging'],
        ['Improved', 'Pagination changed to cursor-based approach for query logs'],
        ['Fixed',    'Reduced global cache TTL from 5s to 3s for improved freshness'],
      ],
    },
    {
      ver: 'v3.3.37-stable', date: 'January 1, 2026',
      changes: [
        ['New',      'Change password functionality with validation modal'],
        ['New',      'Logout confirmation modal with localStorage cleanup'],
        ['New',      'MongoDB auto-delete index for Analytics collection (TTL)'],
        ['Fixed',    'passwordUpdatedAt timestamp issue in User collection'],
        ['Improved', 'Auth store enhanced with passwordUpdatedAt tracking'],
      ],
    },
    {
      ver: 'v1.2.7-stable', date: 'October 2, 2025',
      changes: [
        ['New',      'Connected Devices page — view all active devices on the LAN'],
        ['New',      'Domain management — DomainCard, DomainModal, RecordModal components'],
        ['New',      'DHCP controller for fetching connected IPs and network info'],
        ['Improved', 'Database configuration includes default RBAC roles'],
        ['Improved', 'Authentication middleware added with JWT guard on all routes'],
      ],
    },
    {
      ver: 'v1.1.5-stable', date: 'September 30, 2025',
      changes: [
        ['New',      'Install script — start, stop, and update commands added'],
        ['New',      'Complete uninstall / remove flow via install.sh'],
        ['Improved', 'Cluster mode with PM2 — multi-core DNS processing'],
        ['Improved', 'Docker Compose v2 configuration and optimized build'],
        ['Fixed',    'Auth controller refactored to use BuildResponse for consistent errors'],
      ],
    },
    {
      ver: 'v1.0.0', date: 'September 24, 2025', tag: 'INITIAL',
      changes: [
        ['New', 'Core DNS server with Redis caching (7-layer query pipeline)'],
        ['New', 'Web dashboard — Next.js + React management interface'],
        ['New', 'Support for A, AAAA and CNAME records'],
        ['New', 'Domain blocking with exact-match and wildcard rules'],
        ['New', 'GitHub Actions workflow for Docker image build and push'],
        ['New', 'MongoDB with RBAC — role-based access control from day one'],
      ],
    },
  ]},
  { type: 'callout', tone: 'info', title: 'Stay updated', text: 'Watch releases on GitHub at github.com/nexoral/NexoralDNS/releases.' },
];

export default function Changelog() {
  return (
    <DocPage
      group="Reference"
      title="Changelog"
      intro="A complete timeline of all NexoralDNS releases, from initial launch to the latest version. Most recent first."
      blocks={blocks}
    />
  );
}
