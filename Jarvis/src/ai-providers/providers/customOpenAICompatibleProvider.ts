import { OPENAI_API_BASE, OPENAI_DEFAULT_MODEL, RECOMMENDED_MODELS } from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { openAiCompatibleChat } from './openAiCompatibleChat'
import type { HybridProvider, ProviderChatRequest, ProviderChatResult, ProviderTestResult } from '../types'

export const customOpenAICompatibleProvider: HybridProvider = {
  id: 'custom',
  displayName: '사용자 지정 API',
  category: 'paid',
  requiresApiKey: true,
  defaultApiBase: OPENAI_API_BASE,
  signupUrl: '',
  docsHint: 'OpenAI 호환 Chat Completions 엔드포인트를 직접 입력합니다. 유료일 수 있으므로 자동 폴백 대상이 아닙니다.',
  recommendedModels: RECOMMENDED_MODELS.custom,
  supportsOpenAIFormat: true,

  isConfigured() {
    const s = getProviderSlot('custom')
    return Boolean(s.apiKey.trim() && (s.apiBase || '').trim())
  },
  getSlot() {
    return getProviderSlot('custom')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('custom')
    if (!slot.apiKey.trim() || !(slot.apiBase || '').trim()) {
      return { ok: false, message: 'API 키와 API Base가 필요합니다.' }
    }
    const started = Date.now()
    try {
      const r = await openAiCompatibleChat({
        apiBase: slot.apiBase || OPENAI_API_BASE,
        apiKey: slot.apiKey,
        model: slot.model || OPENAI_DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
      })
      updateProviderSlot('custom', {
        status: 'ok',
        lastSuccessAt: new Date().toISOString(),
        lastError: undefined,
      })
      return { ok: true, message: '연결 성공', model: r.model, latencyMs: Date.now() - started }
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      updateProviderSlot('custom', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('custom')
    const r = await openAiCompatibleChat({
      apiBase: slot.apiBase || OPENAI_API_BASE,
      apiKey: slot.apiKey,
      model: req.model || slot.model || OPENAI_DEFAULT_MODEL,
      messages: req.messages,
      signal: req.signal,
    })
    updateProviderSlot('custom', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, finishReason: r.finishReason, providerId: 'custom' }
  },
}
