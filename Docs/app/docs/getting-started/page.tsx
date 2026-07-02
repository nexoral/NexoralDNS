import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';
import { getInstallScriptUrl, installCommand } from '@/lib/github';

async function getBlocks(): Promise<Block[]> {
  const scriptUrl = await getInstallScriptUrl();
  const INSTALL = installCommand(scriptUrl);

  return [
  { type: 'h', title: 'Prerequisites' },
  { type: 'list', variant: 'check', items: [
    'Linux, macOS, or Windows — any OS that runs Docker',
    '2GB+ RAM recommended (minimum)',
    'Terminal / shell access to run commands',
    'Network access with LAN connectivity',
  ]},
  { type: 'callout', tone: 'info', title: 'Docker is handled for you', text: 'Docker will be installed automatically if it is not already present on your system.' },
  { type: 'h', title: 'Setup in four steps' },
  { type: 'steps', steps: [
    { title: 'Install NexoralDNS', text: 'Run the one-command installer. This downloads and starts all required services automatically.', code: INSTALL },
    { title: 'Access the dashboard', text: 'Once services are up, open the web dashboard in your browser.', bullets: ['From this machine — http://localhost:4000', 'From other devices — http://192.168.x.x:4000'] },
    { title: 'Configure your router', text: 'Point your network at NexoralDNS so every device benefits.', bullets: ['Log into your router admin panel (usually 192.168.1.1 or 192.168.0.1)', 'Find DNS settings under LAN, DHCP, or Network', 'Set Primary DNS to your NexoralDNS server IP', 'Save and restart your router'] },
    { title: 'Create your first custom domain', text: 'In the dashboard, go to Domains → Add Domain.', bullets: ['Enter domain — myserver.local', 'Point to IP — 192.168.1.100', 'Now try pinging myserver.local from any device!'] },
  ]},
  { type: 'callout', tone: 'success', title: 'Congratulations!', text: "NexoralDNS is now managing your network's DNS. All queries from your devices will be logged, cached, and fully customizable from the dashboard." },
  { type: 'h', title: "What's next" },
  { type: 'next', title: 'Continue exploring', cols: 3, items: [
    { icon: '✨', title: 'Explore Features', href: '/docs/features' },
    { icon: '🔌', title: 'API Reference',   href: '/docs/api' },
    { icon: '🔧', title: 'Troubleshooting', href: '/docs/troubleshooting' },
    { icon: '🔒', title: 'Security',        href: '/docs/security' },
    { icon: '❓', title: 'FAQ',             href: '/docs/faq' },
    { icon: '🧬', title: 'Architecture',    href: '/docs/architecture' },
  ]},
  ];
}

export default async function GettingStarted() {
  const blocks = await getBlocks();
  return (
    <DocPage
      group="Get Started"
      title="Getting Started"
      badge="5 minute setup"
      intro="A step-by-step onboarding guide to get NexoralDNS running on your network in about five minutes."
      blocks={blocks}
    />
  );
}
