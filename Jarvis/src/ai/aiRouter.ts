import { selectAiMode } from './modeSelect'
import { openaiCompatibleProvider } from './providers/openaiCompatible'
import type { AiProvider, AiRequest, AiRouteDecision } from './types'

const providers: AiProvider[] = [openaiCompatibleProvider]

export function listAiProviders(): AiProvider[] {
  return [...providers]
}

/**
 * Route to the current working provider only.
 * No fake fallbacks — adapters for other vendors can be registered later.
 */
export function routeAiRequest(req: AiRequest): AiRouteDecision {
  const mode = req.forceMode || req.mode || selectAiMode(req.message)
  const model = req.model?.trim() || 'gpt-4o-mini'

  const available = providers.filter((p) => p.isAvailable(req))
  if (!available.length) {
    return {
      provider: 'none',
      model,
      mode,
      reason: 'no-available-provider',
    }
  }

  // Single real provider today: openai-compatible (settings.apiBase/model).
  const primary = available[0]!
  return {
    provider: primary.id,
    model,
    mode,
    reason: 'primary-openai-compatible',
  }
}

export function getProvider(id: string): AiProvider | undefined {
  return providers.find((p) => p.id === id)
}
