import { GROQ_API_BASE, GROQ_DEFAULT_MODEL, RECOMMENDED_MODELS } from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { openAiCompatibleChat } from './openAiCompatibleChat'
import type { HybridProvider, ProviderChatRequest, ProviderChatResult, ProviderTestResult } from '../types'

export const groqProvider: HybridProvider = {
  id: 'groq',
  displayName: 'Groq',
  category: 'free',
  requiresApiKey: true,
  defaultApiBase: GROQ_API_BASE,
  signupUrl: 'https://console.groq.com/keys',
  docsHint: '빠른 응답용 무료 사용량이 있습니다. 한도와 모델은 Groq 정책에 따라 변경될 수 있습니다.',
  recommendedModels: RECOMMENDED_MODELS.groq,
  supportsOpenAIFormat: true,

  isConfigured() {
    return Boolean(getProviderSlot('groq').apiKey.trim())
  },
  getSlot() {
    return getProviderSlot('groq')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('groq')
    if (!slot.apiKey.trim()) return { ok: false, message: 'API 키가 없습니다.' }
    const started = Date.now()
    try {
      const r = await openAiCompatibleChat({
        apiBase: GROQ_API_BASE,
        apiKey: slot.apiKey,
        model: slot.model || GROQ_DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
      })
      updateProviderSlot('groq', {
        status: 'ok',
        lastSuccessAt: new Date().toISOString(),
        lastError: undefined,
      })
      return { ok: true, message: '연결 성공', model: r.model, latencyMs: Date.now() - started }
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      updateProviderSlot('groq', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('groq')
    const r = await openAiCompatibleChat({
      apiBase: GROQ_API_BASE,
      apiKey: slot.apiKey,
      model: req.model || slot.model || GROQ_DEFAULT_MODEL,
      messages: req.messages,
      signal: req.signal,
    })
    updateProviderSlot('groq', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, finishReason: r.finishReason, providerId: 'groq' }
  },
}
