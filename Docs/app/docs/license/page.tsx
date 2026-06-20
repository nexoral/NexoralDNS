import DocPage from '@/components/DocPage';
import type { Block } from '@/components/DocPage';

const blocks: Block[] = [
  { type: 'h', title: 'What you can do' },
  { type: 'cards', cols: 2, items: [
    { icon: '💼', title: 'Commercial Use', desc: 'Use NexoralDNS in commercial products and services.' },
    { icon: '🔧', title: 'Modify',         desc: 'Modify the source code to fit your needs.' },
    { icon: '📦', title: 'Distribute',     desc: 'Distribute copies of NexoralDNS.' },
    { icon: '🏠', title: 'Private Use',    desc: 'Use NexoralDNS for personal or private purposes.' },
  ]},
  { type: 'h', title: 'Requirements & limitations' },
  { type: 'list', variant: 'check', items: [
    'Include the license and copyright notice in substantial distributions',
    'Keep the original copyright notice in copies or modifications',
  ]},
  { type: 'list', variant: 'cross', items: [
    'No liability — provided "as is", authors not liable for damages',
    'No warranty — no merchantability or fitness guarantee',
  ]},
  { type: 'h', title: 'Full MIT License text' },
  { type: 'code', prompt: false, label: 'MIT License', code: `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED.` },
  { type: 'callout', tone: 'info', title: 'License declaration', text: 'The MIT License is the binding declaration for NexoralDNS. Copyright 2024 Nexoral.' },
];

export default function License() {
  return (
    <DocPage
      group="Project"
      title="License"
      intro="NexoralDNS is released under the MIT License. Copyright 2024 Nexoral."
      blocks={blocks}
    />
  );
}
