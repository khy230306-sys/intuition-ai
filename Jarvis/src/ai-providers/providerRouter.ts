import { AiError } from '../ai/errors'
import { buildAiContext } from '../ai/contextManager'
import { selectAiMode } from '../ai/modeSelect'
import { buildChatMessages } from '../ai/promptBuilder'
import { validateAiResponse } from '../ai/responseValidator'
import {
  hasAnyConfiguredProvider,
  loadHybridAiConfig,
  updateProviderSlot,
} from './providerConfig'
import {
  isFallbackableError,
  mapAiErrorToHybrid,
  userFacingHybridError,
} from './providerErrors'
import { LOCAL_NO_AI_MESSAGE } from './providers/localFallbackProvider'
import { AUTO_PROVIDER_ORDER, getHybridProvider } from './providerRegistry'
import { recordUsage } from './providerUsage'
import type { HybridChatInput, HybridChatOutput, HybridProviderId } from './types'

function buildCandidateOrder(): HybridProviderId[] {
  const cfg = loadHybridAiConfig()
  if (cfg.mode === 'fixed' && cfg.fixedProvider) {
    return [cfg.fixedProvider]
  }

  const freeFirst = AUTO_PROVIDER_ORDER.filter((id) => {
    const p = getHybridProvider(id)
    if (!p) return false
    if (!p.isConfigured()) return false
    const slot = p.getSlot()
    if (slot.enabled === false) return false
    if (p.category === 'paid' && !cfg.allowPaidFallback) return false
    return true
  })

  return freeFirst
}

/**
 * Hybrid chat with free-first routing and safe fallback.
 * Paid providers are skipped unless fixed or allowPaidFallback=true.
 */
export async function runHybridChat(input: HybridChatInput): Promise<HybridChatOutput> {
  if (!hasAnyConfiguredProvider()) {
    recordUsage({ ok: false })
    throw new AiError('config', LOCAL_NO_AI_MESSAGE, { retryable: false })
  }

  const order = buildCandidateOrder()
  if (!order.length) {
    const cfg = loadHybridAiConfig()
    if (cfg.mode === 'fixed' && cfg.fixedProvider) {
      const p = getHybridProvider(cfg.fixedProvider)
      if (!p?.isConfigured()) {
        throw new AiError('config', '선택한 Provider에 API 키가 없습니다.', { retryable: false })
      }
    }
    throw new AiError(
      'config',
      '사용 가능한 무료 AI가 없습니다. 설정에서 무료 AI를 연결하거나 유료 자동 사용을 허용해 주세요.',
      { retryable: false },
    )
  }

  const mode = selectAiMode(input.message)
  const history = buildAiContext(input.history || [])
  const messages = buildChatMessages(
    {
      message: input.message,
      displayName: input.displayName,
      lifeContext: input.lifeContext,
      riskTolerance: input.riskTolerance,
      investHorizon: input.investHorizon,
      locale: input.locale,
      mode,
    },
    mode,
    history,
  )

  const attempted: HybridProviderId[] = []
  let lastErr: unknown
  let fallbackUsed = false

  for (const id of order) {
    const provider = getHybridProvider(id)
    if (!provider?.isConfigured()) continue
    attempted.push(id)
    try {
      const result = await provider.sendChat({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model: provider.getSlot().model,
        signal: input.signal,
      })
      const validated = validateAiResponse(result.text)
      if (!validated.ok) {
        throw new AiError('bad_response', `응답 검증 실패: ${validated.reason}`, { retryable: true })
      }
      recordUsage({ provider: id, ok: true, fallback: fallbackUsed })
      return {
        text: validated.text,
        providerId: id,
        model: result.model,
        fallbackUsed,
        attempted,
      }
    } catch (err) {
      lastErr = err
      const code = mapAiErrorToHybrid(err)
      updateProviderSlot(id, {
        status:
          code === 'quota'
            ? 'quota'
            : code === 'rate_limit'
              ? 'rate_limit'
              : code === 'invalid_key' || code === 'payment_required'
                ? 'auth'
                : 'error',
        lastError: err instanceof Error ? err.message : String(err),
      })
      recordUsage({ provider: id, ok: false, fallback: fallbackUsed })
      if (!isFallbackableError(err)) break
      fallbackUsed = true
      continue
    }
  }

  if (lastErr instanceof AiError && lastErr.kind === 'config') throw lastErr
  throw new AiError('unavailable', userFacingHybridError(lastErr) || LOCAL_NO_AI_MESSAGE, {
    retryable: false,
    cause: lastErr,
  })
}

export function hybridNoProviderMessage(): string {
  return LOCAL_NO_AI_MESSAGE
}
