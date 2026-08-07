/** Central recommended model catalog — IDs may change; users can override. */

import type { HybridProviderId, ModelInfo } from './types'

export const OPENROUTER_DEFAULT_MODEL = 'openrouter/free'
/** Alias that tracks Google's current Flash for new API keys. */
export const GEMINI_DEFAULT_MODEL = 'gemini-flash-latest'
export const GROQ_DEFAULT_MODEL = 'llama-3.1-8b-instant'
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini'

export const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'
export const GROQ_API_BASE = 'https://api.groq.com/openai/v1'
export const OPENAI_API_BASE = 'https://api.openai.com/v1'
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const RECOMMENDED_MODELS: Record<HybridProviderId, ModelInfo[]> = {
  openrouter: [
    { id: 'openrouter/free', label: 'Free Models Router', category: 'chat', freeHint: true },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      label: 'Llama 3.3 70B (free)',
      category: 'chat',
      freeHint: true,
    },
    {
      id: 'google/gemma-3-27b-it:free',
      label: 'Gemma 3 27B (free)',
      category: 'fast',
      freeHint: true,
    },
  ],
  gemini: [
    { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)', category: 'fast', freeHint: true },
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite (latest)', category: 'fast', freeHint: true },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', category: 'fast', freeHint: true },
  ],
  groq: [
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', category: 'fast', freeHint: true },
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', category: 'chat', freeHint: true },
    { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', category: 'coding', freeHint: true },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', category: 'chat' },
    { id: 'gpt-4o', label: 'GPT-4o', category: 'analysis' },
  ],
  custom: [{ id: 'gpt-4o-mini', label: 'Custom model', category: 'chat' }],
}

export function defaultModelFor(id: HybridProviderId): string {
  switch (id) {
    case 'openrouter':
      return OPENROUTER_DEFAULT_MODEL
    case 'gemini':
      return GEMINI_DEFAULT_MODEL
    case 'groq':
      return GROQ_DEFAULT_MODEL
    case 'openai':
      return OPENAI_DEFAULT_MODEL
    case 'custom':
      return OPENAI_DEFAULT_MODEL
  }
}
