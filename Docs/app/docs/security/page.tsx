import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Supported versions' },
  { type: 'table', grid: '1fr 2fr', head: ['Version', 'Status'], rows: [
    { key: 'Latest', cells: ['✓ Always recommended'] },
    { key: '1.x.x',  cells: ['✓ Current stable branch'] },
    { key: '< 1.0',  cells: ['✕ Please upgrade'] },
  ]},
  { type: 'callout', tone: 'danger', title: 'Do not use public issues', text: 'Never report security vulnerabilities through public GitHub issues. Email security@nexoral.in instead.' },
  { type: 'h', title: 'Reporting a vulnerability' },
  { type: 'kv', items: [
    { k: 'Email',     v: 'security@nexoral.in' },
    { k: 'Subject',   v: '[SECURITY] Brief description' },
    { k: 'Encryption',v: 'PGP key at nexoral.in/security (optional)' },
    { k: 'Premium',   v: 'Use the priority channel, mark URGENT — SECURITY ISSUE' },
  ]},
  { type: 'p', text: 'Include: vulnerability type (CWE/CVE), affected components and version, impact assessment, reproduction steps, and suggested mitigation.' },
  { type: 'h', title: 'Response timeline' },
  { type: 'table', grid: '1.2fr 1fr 1fr', head: ['Stage', 'Free', 'Premium'], rows: [
    { key: 'Initial Response', cells: ['5 business days', '24 hours'] },
    { key: 'Status Update',   cells: ['Weekly', 'Every 2–3 days'] },
    { key: 'Triage Complete', cells: ['14 days', '3–5 days'] },
  ]},
  { type: 'h', title: 'Severity targets' },
  { type: 'table', grid: '1fr 1fr 1.2fr', head: ['Severity', 'Initial', 'Fix'], rows: [
    { key: 'Critical', cells: ['24h',    '7–14 days'] },
    { key: 'High',     cells: ['48h',    '14–30 days'] },
    { key: 'Medium',   cells: ['5 days', '30–60 days'] },
    { key: 'Low',      cells: ['10 days','Next release'] },
  ]},
  { type: 'h', title: 'Best practices' },
  { type: 'list', variant: 'check', items: [
    'Keep NexoralDNS updated',
    'Change default credentials immediately',
    'Never expose port 53 or 4000 to the public internet',
    'Limit dashboard access and review user permissions',
    'Monitor query logs for suspicious activity',
    'Back up configuration and test restores',
  ]},
  { type: 'h', title: 'Scope — In' },
  { type: 'list', variant: 'check', items: [
    'NexoralDNS server (DNS, DHCP, Broker)',
    'Web dashboard & management interface',
    'API endpoints and authentication',
    'Access control, data storage and encryption',
    'Docker containers and installation scripts',
  ]},
  { type: 'h', title: 'Scope — Out' },
  { type: 'list', variant: 'cross', items: [
    'Third-party dependency vulnerabilities',
    'Social engineering / physical attacks',
    'Denial of Service (DoS) attacks',
    'User-modified installations',
    'Theoretical issues without a practical exploit',
  ]},
  { type: 'callout', tone: 'info', title: 'Safe harbour', text: 'No legal action against researchers acting in good faith who avoid privacy violations and data destruction, and who follow this disclosure policy.' },
];

export default function Security() {
  return (
    <DocPage
      group="Help"
      title="Security Policy"
      intro="How to report vulnerabilities responsibly and the practices that keep your NexoralDNS deployment safe."
      blocks={blocks}
    />
  );
}
