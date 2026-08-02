import { OPENAI_API_BASE, OPENAI_DEFAULT_MODEL, RECOMMENDED_MODELS } from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { openAiCompatibleChat } from './openAiCompatibleChat'
import type { HybridProvider, ProviderChatRequest, ProviderChatResult, ProviderTestResult } from '../types'

export const openAIProvider: HybridProvider = {
  id: 'openai',
  displayName: 'OpenAI',
  category: 'paid',
  requiresApiKey: true,
  defaultApiBase: OPENAI_API_BASE,
  signupUrl: 'https://platform.openai.com/api-keys',
  docsHint:
    '사용량 기반 유료 API입니다. ChatGPT Plus와 API 결제는 별개입니다. 자동 유료 사용은 기본 차단됩니다.',
  recommendedModels: RECOMMENDED_MODELS.openai,
  supportsOpenAIFormat: true,

  isConfigured() {
    return Boolean(getProviderSlot('openai').apiKey.trim())
  },
  getSlot() {
    return getProviderSlot('openai')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('openai')
    if (!slot.apiKey.trim()) return { ok: false, message: 'API 키가 없습니다.' }
    const started = Date.now()
    try {
      const r = await openAiCompatibleChat({
        apiBase: slot.apiBase || OPENAI_API_BASE,
        apiKey: slot.apiKey,
        model: slot.model || OPENAI_DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
      })
      updateProviderSlot('openai', {
        status: 'ok',
        lastSuccessAt: new Date().toISOString(),
        lastError: undefined,
      })
      return { ok: true, message: '연결 성공', model: r.model, latencyMs: Date.now() - started }
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      updateProviderSlot('openai', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('openai')
    const r = await openAiCompatibleChat({
      apiBase: slot.apiBase || OPENAI_API_BASE,
      apiKey: slot.apiKey,
      model: req.model || slot.model || OPENAI_DEFAULT_MODEL,
      messages: req.messages,
      signal: req.signal,
    })
    updateProviderSlot('openai', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, finishReason: r.finishReason, providerId: 'openai' }
  },
}
