import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'faq', heading: 'General', items: [
    { q: 'Is NexoralDNS free?',            a: 'Yes — a generous free tier for home users and developers. The premium tier adds advanced features for businesses.' },
    { q: 'How does it compare to Pi-hole?', a: 'NexoralDNS is built on a modern stack (Node.js, Redis, MongoDB) with sub-ms caching, built-in HA clustering, a React dashboard, REST API and multi-user RBAC — more scalable and API-driven.' },
  ]},
  { type: 'faq', heading: 'Installation', items: [
    { q: 'Can I run it on a Raspberry Pi?', a: 'Yes — it is lightweight and Docker-compatible with ARM64 images. Runs on Raspberry Pi 3, 4 and 5.' },
    { q: 'Port 53 is already in use?',      a: 'Common on Ubuntu/Debian where systemd-resolved listens on port 53. Disable it:', code: 'sudo systemctl stop systemd-resolved\nsudo systemctl disable systemd-resolved', prompt: false },
  ]},
  { type: 'faq', heading: 'Usage', items: [
    { q: 'How do I block ads?', a: 'Two ways: subscribe to a public ad-blocking list (e.g. StevenBlack) in the Blocking section, or manually add specific domains like ads.google.com to the block list.' },
    { q: 'Can I create wildcard DNS records?', a: 'Yes — use *.local.example.com syntax in the DNS Records section of the dashboard.' },
    { q: 'How many devices can I connect?',    a: 'Unlimited devices. NexoralDNS serves as the DNS resolver for your entire network segment.' },
  ]},
  { type: 'faq', heading: 'Troubleshooting', items: [
    { q: 'Dashboard shows "Connection Lost"', a: 'The API server is not reachable. Check docker ps, review docker logs nexoraldns-api, and ensure port 4000 is open.' },
    { q: 'DNS queries are slow',              a: 'Check that Redis is running (docker ps). Most queries should resolve from cache in <2ms. If all queries hit upstream, Redis may be down.' },
  ]},
  { type: 'next', title: 'Need more help?', cols: 3, items: [
    { icon: '🔧', title: 'Troubleshooting', href: '/docs/troubleshooting' },
    { icon: '🔒', title: 'Security',        href: '/docs/security' },
    { icon: '✉️', title: 'Contact Us',      href: '/contact' },
  ]},
];

export default function FAQ() {
  return (
    <DocPage
      group="Help"
      title="Frequently Asked Questions"
      intro="Answers to common questions across general usage, installation, configuration and troubleshooting."
      blocks={blocks}
    />
  );
}
