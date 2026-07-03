import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';
import { getInstallScriptUrl, installCommand } from '@/lib/github';

async function getBlocks(): Promise<Block[]> {
  const scriptUrl = await getInstallScriptUrl();
  const INSTALL = installCommand(scriptUrl);

  return [
  { type: 'callout', tone: 'danger', title: 'This is irreversible', text: "Permanently deletes all DNS records, configurations, query logs, cache data and user settings. Back up first." },
  { type: 'h', title: 'Command' },
  { type: 'code', code: installCommand(scriptUrl, 'remove'), label: 'remove' },
  { type: 'h', title: 'What it does' },
  { type: 'list', variant: 'dot', items: [
    "Prompts for confirmation (type 'yes' exactly)",
    'Stops and removes all containers, images and volumes',
    'Deletes networks and the installation directory',
    'Restores original DNS configuration and cleans up config files',
    'Purges the nexoraldns CLI package and executable command shortcuts',
  ]},
  { type: 'h', title: 'What is NOT removed' },
  { type: 'list', variant: 'check', items: [
    'Docker and Docker Compose (remain installed)',
    'System packages installed as dependencies',
    'Router settings (update these manually)',
    'External backups outside the install directory',
  ]},
  { type: 'h', title: 'Pre-removal backup' },
  { type: 'code', prompt: false, label: 'backup volume', code: `sudo docker run --rm -v nexoraldns_db-data:/data -v ~/nexoraldns-backup:/backup \\
  alpine tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz -C /data .` },
  { type: 'h', title: 'Reinstalling' },
  { type: 'code', code: INSTALL, label: 'reinstall' },
  ];
}

export default async function RemoveCommand() {
  const blocks = await getBlocks();
  return (
    <DocPage
      group="Commands"
      title="Remove"
      intro="Completely uninstall NexoralDNS and all associated data."
      blocks={blocks}
    />
  );
}
