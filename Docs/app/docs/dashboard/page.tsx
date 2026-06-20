import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Accessing the dashboard' },
  { type: 'kv', items: [
    { k: 'Default URL', v: 'http://localhost:4000' },
    { k: 'Username',    v: 'admin' },
    { k: 'Password',    v: 'admin' },
  ]},
  { type: 'callout', tone: 'warn', title: 'Change your password immediately', text: 'The default credentials are admin / admin. You must change the password right after first login — go to Settings → Change Password.' },
  { type: 'h', title: 'Main sections' },
  { type: 'cards', cols: 3, items: [
    { icon: '📈', title: 'Overview',    desc: 'Real-time snapshot — total queries, blocked queries, cache hit rate, active clients, and CPU/memory status.' },
    { icon: '🗂️', title: 'DNS Records', desc: 'Manage A, AAAA, CNAME and TXT records mapping hostnames to addresses or aliases.' },
    { icon: '🔀', title: 'Rewrites',    desc: 'Domain rerouting rules — source domain, target domain, and client-specific overrides.' },
    { icon: '🛡️', title: 'Blocking',    desc: 'Exact-match, wildcard, public block lists, and allow lists that are never blocked.' },
    { icon: '📜', title: 'Query Logs',  desc: 'Every query with timestamp, client IP, domain, type, status (NOERROR/NXDOMAIN/BLOCKED) and response time.' },
    { icon: '⚙️', title: 'Settings',    desc: 'Global server settings — upstream DNS, cache TTL, rate limiting and user management.' },
  ]},
  { type: 'h', title: 'Record types' },
  { type: 'kv', items: [
    { k: 'A Records',     v: 'Map hostname to an IPv4 address' },
    { k: 'AAAA Records',  v: 'Map hostname to an IPv6 address' },
    { k: 'CNAME Records', v: 'Map hostname to another hostname (alias)' },
  ]},
  { type: 'h', title: 'Additional features' },
  { type: 'list', variant: 'check', items: [
    'Fully responsive — works on phone and tablet',
    'Dark mode toggle via the sun/moon icon in the top-right corner',
  ]},
  { type: 'next', title: 'Next steps', cols: 3, items: [
    { icon: '✨', title: 'Features',     href: '/docs/features' },
    { icon: '🧬', title: 'Architecture', href: '/docs/architecture' },
    { icon: '🔌', title: 'API Reference',href: '/docs/api' },
  ]},
];

export default function Dashboard() {
  return (
    <DocPage
      group="Get Started"
      title="Dashboard"
      intro="The NexoralDNS web interface is the central control hub for records, blocking, rewrites, logs, and settings."
      blocks={blocks}
    />
  );
}
