import { AiError } from '../../ai/errors'
import { ANTHROPIC_API_BASE, ANTHROPIC_DEFAULT_MODEL, RECOMMENDED_MODELS } from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { classifyProviderBody } from '../providerErrors'
import type {
  HybridProvider,
  ProviderChatRequest,
  ProviderChatResult,
  ProviderTestResult,
} from '../types'

const ANTHROPIC_VERSION = '2023-06-01'

function splitSystem(messages: ProviderChatRequest['messages']): {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n')
    .trim()
  const rest = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))
  // Anthropic requires alternating roles starting with user
  if (!rest.length) rest.push({ role: 'user', content: 'OK' })
  if (rest[0]!.role !== 'user') rest.unshift({ role: 'user', content: '(continue)' })
  return { system, messages: rest }
}

async function anthropicMessages(
  apiKey: string,
  model: string,
  messages: ProviderChatRequest['messages'],
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const { system, messages: bodyMessages } = splitSystem(messages)
  let res: Response
  try {
    res = await fetch(`${ANTHROPIC_API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        temperature: 0.55,
        ...(system ? { system } : {}),
        messages: bodyMessages,
      }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new AiError('cancelled', '요청이 취소되었습니다.', { retryable: false, cause: err })
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AiError('offline', '오프라인', { retryable: false, cause: err })
    }
    throw new AiError('network', '네트워크 오류', { retryable: true, cause: err })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw classifyProviderBody(res.status, errText)
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>
    model?: string
  }
  const text =
    data.content
      ?.filter((p) => p.type === 'text' || p.text)
      .map((p) => p.text || '')
      .join('')
      .trim() || ''
  if (!text) throw new AiError('bad_response', '빈 응답', { retryable: true })
  return { text, model: data.model || model }
}

export const anthropicProvider: HybridProvider = {
  id: 'anthropic',
  displayName: 'Anthropic Claude',
  category: 'paid',
  requiresApiKey: true,
  defaultApiBase: ANTHROPIC_API_BASE,
  signupUrl: 'https://console.anthropic.com/settings/keys',
  docsHint:
    'Anthropic Console에서 API 키를 발급하세요. 아이디어 은행의 Claude 심장(생성·발전)이 이 Provider를 우선 사용합니다.',
  recommendedModels: RECOMMENDED_MODELS.anthropic,
  supportsOpenAIFormat: false,

  isConfigured() {
    return Boolean(getProviderSlot('anthropic').apiKey.trim())
  },

  getSlot() {
    return getProviderSlot('anthropic')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('anthropic')
    if (!slot.apiKey.trim()) return { ok: false, message: 'API 키가 없습니다.' }
    const started = Date.now()
    try {
      const r = await anthropicMessages(slot.apiKey, slot.model || ANTHROPIC_DEFAULT_MODEL, [
        { role: 'user', content: 'Reply with OK only.' },
      ])
      updateProviderSlot('anthropic', {
        status: 'ok',
        lastSuccessAt: new Date().toISOString(),
        lastError: undefined,
      })
      return {
        ok: true,
        message: '연결 성공',
        model: r.model,
        latencyMs: Date.now() - started,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      updateProviderSlot('anthropic', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('anthropic')
    const model = req.model || slot.model || ANTHROPIC_DEFAULT_MODEL
    const r = await anthropicMessages(slot.apiKey, model, req.messages, req.signal)
    updateProviderSlot('anthropic', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, providerId: 'anthropic' }
  },
}
