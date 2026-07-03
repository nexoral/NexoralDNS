import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Command' },
  { type: 'code', code: 'nexoraldns pack', label: 'pack' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    'Detects the current host machine CPU architecture (amd64, arm64, or i386)',
    'Fetches the latest version metadata from the GitHub Releases API',
    'Compares the local package version against the remote release version',
    'Downloads the corresponding architecture-specific .deb package if a newer version is available',
    'Installs/upgrades the nexoraldns CLI package itself using dpkg'
  ]},
  { type: 'h', title: 'When to use' },
  { type: 'list', variant: 'check', items: [
    'When a new version of the installer script/CLI tool is released on GitHub',
    'To ensure your CLI client has the latest features, commands, and security updates',
  ]},
  { type: 'h', title: 'Expected output' },
  { type: 'code', prompt: false, label: 'console', code: `[INFO] Detecting architecture: amd64
[INFO] Checking for latest nexoraldns package version...
[INFO] Local CLI Version: 5.8.47-stable | Remote CLI Version: 5.8.48-stable
[INFO] New version 5.8.48-stable available. Downloading...
[INFO] Downloading package: nexoraldns_5.8.48-stable_amd64.deb from https://github.com/nexoral/NexoralDNS/releases/download/5.8.48-stable/nexoraldns_5.8.48-stable_amd64.deb
[INFO] Installing latest package...
[SUCCESS] NexoralDNS CLI package successfully updated to 5.8.48-stable!` },
];

export default function PackCommand() {
  return (
    <DocPage
      group="Commands"
      title="Pack"
      intro="Self-update the nexoraldns CLI wrapper package itself."
      blocks={blocks}
    />
  );
}
