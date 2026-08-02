import { routeAiRequest, getProvider } from './aiRouter'
import { buildAiContext } from './contextManager'
import { AiError, userFacingAiError, redactSecrets } from './errors'
import { selectAiMode } from './modeSelect'
import { buildChatMessages } from './promptBuilder'
import { validateAiResponse } from './responseValidator'
import type { AiRequest, AiResponse } from './types'

const DEFAULT_TIMEOUT_MS = 18_000
const MAX_NETWORK_RETRIES = 2
const MAX_SERVER_RETRIES = 1

let inFlightKey: string | null = null
let inFlightPromise: Promise<AiResponse> | null = null

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AiError('cancelled', '요청이 취소되었습니다.', { retryable: false }))
      return
    }
    const t = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      globalThis.clearTimeout(t)
      reject(new AiError('cancelled', '요청이 취소되었습니다.', { retryable: false }))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function mergeSignals(user?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal
  cleanup: () => void
} {
  const ctrl = new AbortController()
  const onUserAbort = () => ctrl.abort()
  user?.addEventListener('abort', onUserAbort)
  const timer = globalThis.setTimeout(() => ctrl.abort(), timeoutMs)
  return {
    signal: ctrl.signal,
    cleanup: () => {
      globalThis.clearTimeout(timer)
      user?.removeEventListener('abort', onUserAbort)
    },
  }
}

async function completeWithRetries(
  req: AiRequest,
  messages: ReturnType<typeof buildChatMessages>,
  providerId: string,
  outer: AbortSignal,
): Promise<{ text: string; model: string; finishReason?: string; fallbackUsed: boolean }> {
  const provider = getProvider(providerId)
  if (!provider) {
    throw new AiError('unavailable', '사용 가능한 AI 제공자가 없습니다.', { retryable: false })
  }

  let networkAttempts = 0
  let serverAttempts = 0
  let rateLimitAttempts = 0

  while (true) {
    if (outer.aborted) {
      throw new AiError('cancelled', '요청이 취소되었습니다.', { retryable: false })
    }
    try {
      const result = await provider.complete(req, messages, outer)
      return { ...result, fallbackUsed: false }
    } catch (err) {
      if (!(err instanceof AiError)) throw err
      if (err.kind === 'cancelled' || outer.aborted) throw err
      if (err.kind === 'auth' || err.kind === 'config' || err.status === 400) throw err

      if (err.kind === 'rate_limit') {
        if (rateLimitAttempts >= 1) throw err
        rateLimitAttempts += 1
        await sleep(200, outer)
        continue
      }

      if (err.kind === 'network' || err.kind === 'offline') {
        if (networkAttempts >= MAX_NETWORK_RETRIES) throw err
        networkAttempts += 1
        await sleep(300 * networkAttempts, outer)
        continue
      }

      if (err.kind === 'unavailable' || (err.status && err.status >= 500) || err.kind === 'bad_response') {
        // empty response / 5xx: limited retry
        if (err.kind === 'bad_response' && err.message !== '빈 응답') throw err
        if (serverAttempts >= MAX_SERVER_RETRIES) throw err
        serverAttempts += 1
        await sleep(400, outer)
        continue
      }

      throw err
    }
  }
}

/**
 * Run the shared AI engine for free-form cloud chat.
 * Local command routing stays in brain.ts — this only handles LLM calls.
 */
export async function runAiEngine(req: AiRequest): Promise<AiResponse> {
  const started = Date.now()
  const message = req.message.trim()
  if (!message) {
    throw new AiError('bad_response', '빈 입력', { retryable: false })
  }

  const dedupeKey = `${req.apiBase || ''}|${req.model || ''}|${message}`
  if (inFlightKey === dedupeKey && inFlightPromise) {
    return inFlightPromise
  }

  const work = (async (): Promise<AiResponse> => {
    const decision = routeAiRequest(req)
    if (decision.provider === 'none') {
      throw new AiError('config', 'API 키가 없습니다.', { retryable: false })
    }

    const mode = decision.mode || selectAiMode(message)
    const history = buildAiContext(req.history || [])
    const messages = buildChatMessages({ ...req, mode }, mode, history)
    const { signal, cleanup } = mergeSignals(req.signal, DEFAULT_TIMEOUT_MS)

    try {
      let attempt = await completeWithRetries(req, messages, String(decision.provider), signal)
      let validated = validateAiResponse(attempt.text)

      if (!validated.ok) {
        // One safe re-request for empty/bad content only
        if (validated.reason === 'empty' || validated.reason === 'too_short' || validated.reason === 'repeat_loop') {
          attempt = await completeWithRetries(req, messages, String(decision.provider), signal)
          validated = validateAiResponse(attempt.text)
        }
      }

      if (!validated.ok) {
        throw new AiError('bad_response', `응답 검증 실패: ${validated.reason}`, { retryable: false })
      }

      return {
        text: validated.text,
        provider: decision.provider,
        model: attempt.model || decision.model,
        mode,
        finishReason: attempt.finishReason,
        latencyMs: Date.now() - started,
        fallbackUsed: attempt.fallbackUsed,
        warnings: validated.warnings,
      }
    } finally {
      cleanup()
    }
  })()

  inFlightKey = dedupeKey
  inFlightPromise = work
  try {
    return await work
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[aiEngine]', redactSecrets(err instanceof Error ? err.message : String(err)))
    }
    throw err
  } finally {
    if (inFlightPromise === work) {
      inFlightKey = null
      inFlightPromise = null
    }
  }
}

export function aiEngineErrorText(err: unknown): string {
  return userFacingAiError(err)
}

/** Test helper */
export function __resetAiEngineInFlight(): void {
  inFlightKey = null
  inFlightPromise = null
}
