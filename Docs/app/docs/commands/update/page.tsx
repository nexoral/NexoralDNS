import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Command' },
  { type: 'code', code: 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s update', label: 'update' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    'Queries GitHub for the latest release version',
    'Backs up current configuration automatically',
    'Gracefully stops services and pulls latest images',
    'Restarts with the new version and verifies health',
  ]},
  { type: 'callout', tone: 'warn', title: 'Brief downtime', text: 'DNS resolution and the dashboard are unavailable for 30–60 seconds during the update. Schedule during low-usage periods.' },
  { type: 'h', title: 'Configuration backup' },
  { type: 'code', prompt: false, label: 'backup path', code: '/var/lib/nexoraldns/backups/config_YYYY-MM-DD_HH-MM-SS.tar.gz' },
  { type: 'p', text: 'Includes custom DNS records, block lists, user settings and dashboard configurations. Query logs and cache data are not included.' },
  { type: 'h', title: 'Rollback' },
  { type: 'code', prompt: false, label: 'restore', code: `curl -fsSL .../install.sh | bash -s stop
sudo tar -xzf /var/lib/nexoraldns/backups/config_LATEST.tar.gz -C /
curl -fsSL .../install.sh | bash -s start` },
  { type: 'h', title: 'Check versions' },
  { type: 'code', prompt: false, label: 'version check', code: `cd /path/to/NexoralDNS && git describe --tags
curl -s https://api.github.com/repos/nexoral/NexoralDNS/releases/latest | grep tag_name` },
];

export default function UpdateCommand() {
  return (
    <DocPage
      group="Commands"
      title="Update"
      intro="Update to the latest version with automatic backup."
      blocks={blocks}
    />
  );
}
