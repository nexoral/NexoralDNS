'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface CopyCodeBlockProps {
  code: string;
  language?: string;
}

export default function CopyCodeBlock({ code, language = 'bash' }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 z-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-2 border border-gray-700"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </motion.button>
      </div>
      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto">
        <code className={`language-${language} text-sm text-gray-300 font-mono`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
