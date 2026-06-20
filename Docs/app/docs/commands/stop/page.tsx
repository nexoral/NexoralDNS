import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Command' },
  { type: 'code', code: 'curl -fsSL https://raw.githubusercontent.com/nexoral/NexoralDNS/main/Scripts/install.sh | bash -s stop', label: 'stop' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    'Sends graceful shutdown signals to all containers',
    'Stops DNS (port 53) and dashboard (port 4000)',
    'Restores original system DNS configuration',
    'Leaves all data volumes intact',
  ]},
  { type: 'callout', tone: 'success', title: 'Your data is safe', text: 'The stop command does not delete anything — records, cache, statistics and settings are preserved. Run start to resume.' },
  { type: 'h', title: 'Expected output' },
  { type: 'code', prompt: false, label: 'console', code: `[✓] Stopping services...
[✓] All services stopped successfully
[✓] Original DNS configuration restored` },
  { type: 'h', title: 'Alternative methods' },
  { type: 'code', prompt: false, label: 'alternatives', code: `cd /path/to/NexoralDNS/Scripts
sudo docker compose stop
sudo docker compose stop dashboard   # specific service` },
];

export default function StopCommand() {
  return (
    <DocPage
      group="Commands"
      title="Stop"
      intro="Gracefully stop all services — all data is preserved."
      blocks={blocks}
    />
  );
}
