import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';
import { getInstallScriptUrl, installCommand } from '@/lib/github';

async function getBlocks(): Promise<Block[]> {
  const scriptUrl = await getInstallScriptUrl();

  return [
  { type: 'h', title: 'Command' },
  { type: 'code', code: installCommand(scriptUrl, 'start'), label: 'start' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    'Verifies NexoralDNS is installed',
    'Starts all Docker containers in detached mode',
    'Restores DNS configuration to use NexoralDNS',
    'Verifies services and shows status',
  ]},
  { type: 'h', title: 'When to use' },
  { type: 'list', variant: 'check', items: [
    'After running the stop command',
    'After a system reboot (if not auto-restarting)',
    'After network configuration changes',
  ]},
  { type: 'h', title: 'Expected output' },
  { type: 'code', prompt: false, label: 'console', code: `[✓] NexoralDNS installation found
[✓] Starting services...
[✓] All services started successfully
DNS Server Running (Port 53) | Web Dashboard Running (Port 4000)` },
  { type: 'callout', tone: 'info', title: 'Auto-start', text: 'By default containers use restart: unless-stopped — they auto-start after reboot unless explicitly stopped.' },
  ];
}

export default async function StartCommand() {
  const blocks = await getBlocks();
  return (
    <DocPage
      group="Commands"
      title="Start"
      intro="Resume stopped services without reinstalling."
      blocks={blocks}
    />
  );
}
