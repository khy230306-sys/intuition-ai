import { AiError } from '../../ai/errors'
import { GEMINI_API_BASE, RECOMMENDED_MODELS } from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { classifyProviderBody } from '../providerErrors'
import type {
  HybridProvider,
  ProviderChatRequest,
  ProviderChatResult,
  ProviderTestResult,
} from '../types'

function toGeminiContents(messages: ProviderChatRequest['messages']) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  return { system, contents }
}

async function geminiGenerate(
  apiKey: string,
  model: string,
  messages: ProviderChatRequest['messages'],
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const { system, contents } = toGeminiContents(messages)
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        ...(system
          ? { systemInstruction: { parts: [{ text: system }] } }
          : {}),
        generationConfig: { temperature: 0.45 },
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
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || ''
  if (!text) throw new AiError('bad_response', '빈 응답', { retryable: true })
  return { text, model }
}

export const geminiProvider: HybridProvider = {
  id: 'gemini',
  displayName: 'Google Gemini',
  category: 'free',
  requiresApiKey: true,
  defaultApiBase: GEMINI_API_BASE,
  signupUrl: 'https://aistudio.google.com/apikey',
  docsHint: 'Google AI Studio에서 API 키를 발급하세요. 무료 사용량에는 한도가 있습니다.',
  recommendedModels: RECOMMENDED_MODELS.gemini,
  supportsOpenAIFormat: false,

  isConfigured() {
    return Boolean(getProviderSlot('gemini').apiKey.trim())
  },

  getSlot() {
    return getProviderSlot('gemini')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('gemini')
    if (!slot.apiKey.trim()) return { ok: false, message: 'API 키가 없습니다.' }
    const started = Date.now()
    try {
      const r = await geminiGenerate(
        slot.apiKey,
        slot.model,
        [{ role: 'user', content: 'Reply with OK only.' }],
      )
      updateProviderSlot('gemini', {
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
      updateProviderSlot('gemini', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('gemini')
    const model = req.model || slot.model
    const r = await geminiGenerate(slot.apiKey, model, req.messages, req.signal)
    updateProviderSlot('gemini', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, providerId: 'gemini' }
  },
}
