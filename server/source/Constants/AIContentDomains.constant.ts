/**
 * @fileoverview Comprehensive AI Service Domains List
 * @module Constants/AIContentDomains
 * @description Contains a comprehensive list of AI chatbot, AI assistant, and
 * generative-AI service domains, used to seed the Anti-AI Mode domain group
 *
 * @author NexoralDNS Team
 * @version 3.6.45-stable
 */

/**
 * Comprehensive list of AI chatbot / assistant / generative-AI domains
 * Covers major LLM chat interfaces, AI coding assistants, and AI image/video generators
 */
export const AI_CONTENT_DOMAINS: Array<{ domain: string; isWildcard: boolean }> = [
  // ========================================
  // OpenAI / ChatGPT
  // ========================================
  { domain: 'openai.com', isWildcard: true },
  { domain: 'chatgpt.com', isWildcard: true },
  { domain: 'chat.openai.com', isWildcard: false },

  // ========================================
  // Anthropic / Claude
  // ========================================
  { domain: 'anthropic.com', isWildcard: true },
  { domain: 'claude.ai', isWildcard: true },

  // ========================================
  // Google Gemini / Bard
  // ========================================
  { domain: 'gemini.google.com', isWildcard: false },
  { domain: 'bard.google.com', isWildcard: false },
  { domain: 'ai.google.dev', isWildcard: true },
  { domain: 'makersuite.google.com', isWildcard: false },
  { domain: 'aistudio.google.com', isWildcard: false },

  // ========================================
  // Microsoft Copilot
  // ========================================
  { domain: 'copilot.microsoft.com', isWildcard: true },

  // ========================================
  // Meta AI
  // ========================================
  { domain: 'meta.ai', isWildcard: true },

  // ========================================
  // xAI / Grok
  // ========================================
  { domain: 'x.ai', isWildcard: true },
  { domain: 'grok.com', isWildcard: true },

  // ========================================
  // Perplexity
  // ========================================
  { domain: 'perplexity.ai', isWildcard: true },

  // ========================================
  // Character.AI
  // ========================================
  { domain: 'character.ai', isWildcard: true },
  { domain: 'c.ai', isWildcard: true },

  // ========================================
  // Poe (Quora)
  // ========================================
  { domain: 'poe.com', isWildcard: true },

  // ========================================
  // Mistral AI
  // ========================================
  { domain: 'mistral.ai', isWildcard: true },
  { domain: 'chat.mistral.ai', isWildcard: false },

  // ========================================
  // DeepSeek
  // ========================================
  { domain: 'deepseek.com', isWildcard: true },
  { domain: 'chat.deepseek.com', isWildcard: false },

  // ========================================
  // Hugging Face (AI model hub + chat)
  // ========================================
  { domain: 'huggingface.co', isWildcard: true },
  { domain: 'huggingchat.co', isWildcard: true },

  // ========================================
  // AI Image/Video Generation
  // ========================================
  { domain: 'midjourney.com', isWildcard: true },
  { domain: 'leonardo.ai', isWildcard: true },
  { domain: 'runwayml.com', isWildcard: true },
  { domain: 'stability.ai', isWildcard: true },
  { domain: 'dreamstudio.ai', isWildcard: true },
  { domain: 'pika.art', isWildcard: true },
  { domain: 'sora.chatgpt.com', isWildcard: false },
  { domain: 'ideogram.ai', isWildcard: true },

  // ========================================
  // AI Coding Assistants
  // ========================================
  { domain: 'cursor.sh', isWildcard: true },
  { domain: 'cursor.com', isWildcard: true },
  { domain: 'replit.com', isWildcard: true },
  { domain: 'codeium.com', isWildcard: true },
  { domain: 'tabnine.com', isWildcard: true },

  // ========================================
  // Other General-Purpose AI Chat Tools
  // ========================================
  { domain: 'you.com', isWildcard: true },
  { domain: 'pi.ai', isWildcard: true },
  { domain: 'jasper.ai', isWildcard: true },
  { domain: 'writesonic.com', isWildcard: true },
  { domain: 'copy.ai', isWildcard: true },
];

/**
 * Metadata for the AI content domain group
 */
export const AI_CONTENT_GROUP_METADATA = {
  name: 'AI Chat & Generative Tools (Anti-AI)',
  description: 'Curated list of AI chatbot, AI coding assistant, and generative-AI (image/video) service domains, for networks that want to restrict access to AI tools (e.g. schools, exam environments, workplaces).',
  isSystemGroup: true,
  category: 'ai_filtering',
  lastUpdated: new Date('2026-07-02'),
  version: '1.0.0',
};

/**
 * Get formatted domains for database insertion
 */
export function getFormattedAIContentDomains(): Array<{ domain: string; isWildcard: boolean }> {
  return AI_CONTENT_DOMAINS;
}

/**
 * Get total count of domains in the list
 */
export function getAIContentDomainsCount(): number {
  return AI_CONTENT_DOMAINS.length;
}
