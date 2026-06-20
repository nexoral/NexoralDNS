import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'Important notice' },
  { type: 'list', variant: 'check', items: [
    'You can view the source code',
    'You can report bugs and issues',
    'You can suggest features',
    'You can help improve documentation',
  ]},
  { type: 'list', variant: 'cross', items: [
    'Code contributions (pull requests) are not accepted',
    'Modifications to the source code are not permitted',
  ]},
  { type: 'h', title: 'How you can contribute' },
  { type: 'cards', cols: 3, items: [
    { icon: '🐛', title: 'Report Bugs',      desc: 'Open a GitHub issue with the Bug Report template — version, OS, steps, expected vs actual, logs.' },
    { icon: '💡', title: 'Suggest Features', desc: 'Use the Feature Request template — the problem it solves, who benefits, how it works.' },
    { icon: '📝', title: 'Improve Docs',     desc: 'Create issues for typos, unclear instructions, broken links or missing content.' },
    { icon: '🔒', title: 'Report Security',  desc: 'Follow the Security Policy — never use public issues for vulnerabilities.' },
    { icon: '🤝', title: 'Help Other Users', desc: 'Answer GitHub issues, share solutions and help troubleshoot.' },
    { icon: '📣', title: 'Spread the Word',  desc: 'Star the repo, share NexoralDNS and write blog posts or tutorials.' },
  ]},
  { type: 'h', title: 'Issue labels' },
  { type: 'kv', items: [
    { k: 'bug',              v: "Something isn't working correctly" },
    { k: 'feature-request',  v: 'New feature or enhancement' },
    { k: 'documentation',    v: 'Documentation improvements' },
    { k: 'question',         v: 'General usage questions' },
    { k: 'investigating',    v: 'Under review by maintainers' },
  ]},
  { type: 'h', title: 'Why no code contributions?' },
  { type: 'list', variant: 'dot', items: [
    'Commercial product with free and premium tiers',
    'Code quality control and consistent architecture',
    'Support obligations for all features',
    'Intellectual property protection',
    'Faster iteration without PR overhead',
  ]},
  { type: 'callout', tone: 'info', title: 'Paid support & custom development', text: 'Premium licenses include priority support. Enterprise SLAs and bespoke development are available — contact nexoral.in.' },
];

export default function Contributing() {
  return (
    <DocPage
      group="Project"
      title="Contributing"
      intro="NexoralDNS is source-available software. Here is how you can help — and what kinds of contributions are accepted."
      blocks={blocks}
    />
  );
}
