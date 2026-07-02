import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';
import { getInstallScriptUrl, installCommand } from '@/lib/github';

async function getBlocks(): Promise<Block[]> {
  const scriptUrl = await getInstallScriptUrl();
  const INSTALL = installCommand(scriptUrl);

  return [
  { type: 'h', title: 'Command' },
  { type: 'code', code: INSTALL, label: 'install' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    'Verifies system compatibility (Linux Debian/Ubuntu)',
    'Installs Docker and Docker Compose if needed',
    'Downloads the repository and pulls the latest images',
    'Configures system DNS and starts all containers',
    'Verifies installation and shows access info',
  ]},
  { type: 'h', title: 'Expected output' },
  { type: 'code', prompt: false, label: 'console', code: `[✓] System compatibility check passed
[✓] Docker installed successfully
[✓] Services started successfully
[✓] DNS configuration updated
Installation complete!
Access the dashboard at: http://localhost:4000
Default credentials: admin / admin` },
  { type: 'callout', tone: 'warn', title: 'Change the default password', text: 'Change admin / admin immediately after first login at Settings → Change Password.' },
  { type: 'h', title: 'Troubleshooting' },
  { type: 'code', prompt: false, label: 'fixes', code: `# permission denied
sudo curl -fsSL ${scriptUrl} | sudo bash -
# port 53 in use
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved` },
  ];
}

export default async function InstallCommand() {
  const blocks = await getBlocks();
  return (
    <DocPage
      group="Commands"
      title="Install"
      intro="The one-command installer — handles Docker setup and first boot."
      blocks={blocks}
    />
  );
}
