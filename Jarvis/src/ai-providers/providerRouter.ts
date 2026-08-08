import { AiError } from '../ai/errors'
import { buildAiContext } from '../ai/contextManager'
import { selectAiMode } from '../ai/modeSelect'
import { buildChatMessages } from '../ai/promptBuilder'
import { validateAiResponse } from '../ai/responseValidator'
import { chatViaServerIfPreferred } from '../apiKeys/keyService'
import { isServerConfigured } from '../apiKeys/serverFlags'
import {
  hasAnyConfiguredProvider,
  isProviderConfigured,
  loadHybridAiConfig,
  updateProviderSlot,
} from './providerConfig'
import {
  clearProviderCooldown,
  isProviderRoutable,
  markProviderCooldown,
} from './providerCooldown'
import { PROVIDER_ATTEMPT_TIMEOUT_MS, withTimeoutSignal } from './fetchTimeout'
import { markTurn } from '../perf/turnTrace'
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

  const usable = (id: HybridProviderId, allowPaid: boolean): boolean => {
    const p = getHybridProvider(id)
    if (!p) return false
    if (p.category === 'paid' && !allowPaid) return false
    return isProviderRoutable(id)
  }

  const allowPaid = Boolean(cfg.allowPaidFallback)
  const prefer = cfg.fixedProvider

  if (cfg.mode === 'fixed' && prefer) {
    const freeRest = AUTO_PROVIDER_ORDER.filter((id) => id !== prefer && usable(id, false))
    const paidRest = allowPaid
      ? AUTO_PROVIDER_ORDER.filter(
          (id) =>
            id !== prefer &&
            usable(id, true) &&
            getHybridProvider(id)?.category === 'paid',
        )
      : []
    return [...new Set([prefer, ...freeRest, ...paidRest])].filter((id) =>
      usable(id, allowPaid || getHybridProvider(id)?.category === 'free'),
    )
  }

  // Auto mode: still honor preferred seed (e.g. Gemini-first when both keys exist)
  // so we do not burn latency on dead OpenAI before a healthy free provider.
  const base = AUTO_PROVIDER_ORDER.filter((id) => usable(id, allowPaid))
  if (prefer && base.includes(prefer)) {
    return [prefer, ...base.filter((id) => id !== prefer)]
  }
  return base
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
    if (!isProviderConfigured(id) || !provider) continue
    attempted.push(id)

    // Server-held secrets: call via backend proxy (no browser Authorization header)
    if (isServerConfigured(id)) {
      try {
        const proxied = await chatViaServerIfPreferred(
          id,
          messages.map((m) => ({ role: m.role, content: m.content })),
        )
        if (proxied.used && proxied.text) {
          const validated = validateAiResponse(proxied.text)
          if (!validated.ok) {
            throw new AiError('bad_response', `응답 검증 실패: ${validated.reason}`, { retryable: true })
          }
          clearProviderCooldown(id)
          recordUsage({ provider: id, ok: true, fallback: fallbackUsed })
          return {
            text: validated.text,
            providerId: id,
            model: proxied.model || provider.getSlot().model,
            fallbackUsed,
            attempted,
          }
        }
        if (proxied.used && proxied.message) {
          throw new AiError('unavailable', proxied.message, { retryable: true })
        }
      } catch (err) {
        lastErr = err
        fallbackUsed = true
        const code = mapAiErrorToHybrid(err)
        const status =
          code === 'quota'
            ? 'quota'
            : code === 'rate_limit'
              ? 'rate_limit'
              : code === 'invalid_key' || code === 'payment_required'
                ? 'auth'
                : 'error'
        markProviderCooldown(
          id,
          code,
          status,
          err instanceof Error ? err.message : String(err),
        )
        if (!isFallbackableError(err)) break
        continue
      }
    }

    if (!provider.isConfigured()) continue

    const currentModel = provider.getSlot().model
    const modelOrder = [
      currentModel,
      ...provider.recommendedModels.map((m) => m.id).filter((m) => m && m !== currentModel),
    ].filter(Boolean)

    let providerGaveUp = false
    for (let mi = 0; mi < modelOrder.length; mi++) {
      const model = modelOrder[mi]
      const timed = withTimeoutSignal(input.signal, PROVIDER_ATTEMPT_TIMEOUT_MS)
      try {
        markTurn('T6_llm_start', { provider: id, model })
        const result = await provider.sendChat({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model,
          signal: timed.signal,
        })
        markTurn('T8_llm_complete', { provider: id })
        const validated = validateAiResponse(result.text)
        if (!validated.ok) {
          throw new AiError('bad_response', `응답 검증 실패: ${validated.reason}`, { retryable: true })
        }
        if (model !== currentModel) {
          clearProviderCooldown(id)
          updateProviderSlot(id, { model })
          fallbackUsed = true
        } else {
          clearProviderCooldown(id)
        }
        recordUsage({ provider: id, ok: true, fallback: fallbackUsed })
        timed.cancel()
        return {
          text: validated.text,
          providerId: id,
          model: result.model || model,
          fallbackUsed,
          attempted,
        }
      } catch (err) {
        timed.cancel()
        lastErr = err
        const aborted =
          timed.signal.aborted &&
          !(input.signal && input.signal.aborted)
        const code = aborted ? 'network' : mapAiErrorToHybrid(err)
        const status =
          code === 'quota'
            ? 'quota'
            : code === 'rate_limit'
              ? 'rate_limit'
              : code === 'invalid_key' || code === 'payment_required'
                ? 'auth'
                : 'error'
        markProviderCooldown(
          id,
          aborted ? 'network' : code,
          status,
          aborted
            ? `provider timeout ${PROVIDER_ATTEMPT_TIMEOUT_MS}ms`
            : err instanceof Error
              ? err.message
              : String(err),
        )
        recordUsage({ provider: id, ok: false, fallback: fallbackUsed })
        // Dead model → try next recommended model on same provider
        if (code === 'model_unavailable' && mi < modelOrder.length - 1) {
          fallbackUsed = true
          continue
        }
        if (!aborted && !isFallbackableError(err)) {
          providerGaveUp = true
          break
        }
        fallbackUsed = true
        break // try next provider
      }
    }
    if (providerGaveUp) break
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
