import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Contact methods' },
  { type: 'cards', cols: 2, items: [
    { icon: '✉️', title: 'Email',               desc: 'connect@ankan.in — general inquiries and support.' },
    { icon: '🐛', title: 'GitHub Issues',        desc: 'github.com/nexoral/NexoralDNS/issues — report bugs and request features.' },
    { icon: '💬', title: 'GitHub Discussions',   desc: 'Community forum to ask questions and share ideas.' },
    { icon: '🌐', title: 'Official Website',     desc: 'nexoral.in — pricing and commercial inquiries.' },
  ]},
  { type: 'h', title: 'Before you reach out' },
  { type: 'linkCards', cols: 3, items: [
    { icon: '📚', title: 'Check the Docs',   href: '/docs/getting-started' },
    { icon: '❓', title: 'Browse the FAQ',   href: '/docs/faq' },
    { icon: '🔧', title: 'Troubleshooting',  href: '/docs/troubleshooting' },
  ]},
  { type: 'h', title: 'Response time' },
  { type: 'kv', items: [
    { k: 'Email inquiries', v: 'Typically within 24–48 hours' },
    { k: 'Urgent issues',   v: 'Open a GitHub issue with the "urgent" label' },
  ]},
  { type: 'callout', tone: 'info', title: 'Developer', text: 'NexoralDNS is developed and maintained by Ankan — ankan.in.' },
];

export default function Contact() {
  return (
    <DocPage
      group="Project"
      title="Contact"
      intro="Get in touch with the NexoralDNS team for support, bugs, features or commercial inquiries."
      blocks={blocks}
    />
  );
}
