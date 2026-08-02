import { customOpenAICompatibleProvider } from './providers/customOpenAICompatibleProvider'
import { geminiProvider } from './providers/geminiProvider'
import { groqProvider } from './providers/groqProvider'
import { openAIProvider } from './providers/openAIProvider'
import { openRouterProvider } from './providers/openRouterProvider'
import type { HybridProvider, HybridProviderId } from './types'

/** Default auto order: free first, then paid only when allowed/fixed. */
export const AUTO_PROVIDER_ORDER: HybridProviderId[] = [
  'openrouter',
  'gemini',
  'groq',
  'openai',
  'custom',
]

const registry: HybridProvider[] = [
  openRouterProvider,
  geminiProvider,
  groqProvider,
  openAIProvider,
  customOpenAICompatibleProvider,
]

export function listHybridProviders(): HybridProvider[] {
  return [...registry]
}

export function getHybridProvider(id: HybridProviderId): HybridProvider | undefined {
  return registry.find((p) => p.id === id)
}

export function freeProviderIds(): HybridProviderId[] {
  return registry.filter((p) => p.category === 'free').map((p) => p.id)
}

export function paidProviderIds(): HybridProviderId[] {
  return registry.filter((p) => p.category === 'paid').map((p) => p.id)
}
