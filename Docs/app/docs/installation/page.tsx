import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';
import { getInstallScriptUrl, installCommand } from '@/lib/github';

async function getBlocks(): Promise<Block[]> {
  const scriptUrl = await getInstallScriptUrl();
  const INSTALL = installCommand(scriptUrl);

  return [
  { type: 'h', title: 'Quick installation' },
  { type: 'p', text: 'A single command installs Docker, downloads the latest images, and starts every service.' },
  { type: 'code', code: INSTALL, label: 'install' },
  { type: 'h', title: 'What the installer does' },
  { type: 'list', variant: 'check', items: [
    'Installs Docker and Docker Compose if not present',
    'Downloads the latest NexoralDNS images',
    'Configures system DNS settings',
    'Starts all NexoralDNS services',
    'Sets up the web dashboard on port 4000',
  ]},
  { type: 'h', title: 'System requirements' },
  { type: 'table', grid: '1fr 2fr', head: ['Requirement', 'Specification'], rows: [
    { key: 'OS',         cells: ['Linux Debian/Ubuntu (recommended)'] },
    { key: 'Memory',     cells: ['Minimum 1GB RAM (2GB+ recommended)'] },
    { key: 'Storage',    cells: ['Minimum 4GB free space'] },
    { key: 'Network',    cells: ['LAN connectivity — NOT cloud/public'] },
    { key: 'Privileges', cells: ['Administrator / root access'] },
    { key: 'Ports (external)', cells: ['53 UDP/TCP (DNS), 853 TCP (DNS over TLS), 4000 TCP (Web Dashboard)'] },
    { key: 'Ports (internal)', cells: ['27017 TCP (MongoDB), 6379 TCP (Redis) — LAN/container only, not exposed publicly'] },
  ]},
  { type: 'h', title: 'Manual installation' },
  { type: 'steps', steps: [
    { title: 'Clone the repository', code: 'git clone https://github.com/nexoral/NexoralDNS.git\ncd NexoralDNS', prompt: false },
    { title: 'Start containers', code: 'cd Scripts\nsudo docker compose up -d', prompt: false },
    { title: 'Verify installation', text: 'All services should show status "Up".', code: 'sudo docker compose ps' },
  ]},
  { type: 'h', title: 'Post-installation setup' },
  { type: 'steps', steps: [
    { title: 'Access the web interface', text: 'Open http://localhost:4000 in your browser.' },
    { title: 'Initial login', text: 'Sign in with the default credentials.', bullets: ['Username — admin', 'Password — admin'] },
    { title: 'Activate the service', text: 'Enter an activation key from the cloud platform. The free tier is activated automatically if no key is provided.' },
    { title: 'Configure your router', text: "Find the machine's local IP and set it as Primary DNS in your router's DHCP/DNS settings." },
    { title: 'Reserve a static IP', text: 'Reserve the IP in router settings to prevent DNS interruption.' },
  ]},
  { type: 'callout', tone: 'warn', title: 'Change the default password', text: 'Change the default password immediately after first login — go to Settings → Change Password.' },
  { type: 'h', title: 'Service management' },
  { type: 'code', code: installCommand(scriptUrl, 'start'),  label: 'start services' },
  { type: 'code', code: installCommand(scriptUrl, 'stop'),   label: 'stop services' },
  { type: 'code', code: installCommand(scriptUrl, 'update'), label: 'update services' },
  { type: 'code', code: installCommand(scriptUrl, 'remove'), label: 'remove (irreversible)' },
  { type: 'h', title: 'Verification' },
  { type: 'code', code: 'dig @192.168.1.100 google.com        # Linux/Mac\nnslookup google.com 192.168.1.100    # Windows', label: 'test resolution', prompt: false },
  { type: 'code', code: 'sudo docker compose ps', label: 'check status' },
  { type: 'code', code: 'sudo docker compose logs -f\nsudo docker compose logs -f dns-server', label: 'view logs', prompt: false },
  { type: 'next', title: 'Next steps', cols: 4, items: [
    { icon: '✨', title: 'Features',        href: '/docs/features' },
    { icon: '🧬', title: 'Architecture',    href: '/docs/architecture' },
    { icon: '🔌', title: 'API Reference',   href: '/docs/api' },
    { icon: '🔧', title: 'Troubleshooting', href: '/docs/troubleshooting' },
  ]},
  ];
}

export default async function Installation() {
  const blocks = await getBlocks();
  return (
    <DocPage
      group="Get Started"
      title="Installation"
      intro="Everything you need to install NexoralDNS — automated and manual paths, system requirements, service management, and verification."
      blocks={blocks}
    />
  );
}
