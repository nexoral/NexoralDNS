import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'timeline', versions: [
    {
      ver: 'v3.5.44-stable', date: 'June 20, 2026', tag: 'LATEST',
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
