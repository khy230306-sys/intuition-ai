import {
  OPENROUTER_API_BASE,
  OPENROUTER_DEFAULT_MODEL,
  RECOMMENDED_MODELS,
} from '../models'
import { getProviderSlot, updateProviderSlot } from '../providerConfig'
import { openAiCompatibleChat } from './openAiCompatibleChat'
import type { HybridProvider, ProviderChatRequest, ProviderChatResult, ProviderTestResult } from '../types'

export const openRouterProvider: HybridProvider = {
  id: 'openrouter',
  displayName: 'OpenRouter',
  category: 'free',
  requiresApiKey: true,
  defaultApiBase: OPENROUTER_API_BASE,
  signupUrl: 'https://openrouter.ai/keys',
  docsHint: '무료 모델 라우터(openrouter/free)로 시작할 수 있습니다. 무료 사용량에는 한도가 있습니다.',
  recommendedModels: RECOMMENDED_MODELS.openrouter,
  supportsOpenAIFormat: true,

  isConfigured() {
    return Boolean(getProviderSlot('openrouter').apiKey.trim())
  },
  getSlot() {
    return getProviderSlot('openrouter')
  },

  async testConnection(): Promise<ProviderTestResult> {
    const slot = getProviderSlot('openrouter')
    if (!slot.apiKey.trim()) return { ok: false, message: 'API 키가 없습니다.' }
    const started = Date.now()
    try {
      const r = await openAiCompatibleChat({
        apiBase: OPENROUTER_API_BASE,
        apiKey: slot.apiKey,
        model: slot.model || OPENROUTER_DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Reply with OK only.' }],
        extraHeaders: {
          'HTTP-Referer': 'https://jarvis-app.shipstatic.com',
          'X-Title': 'AIZIO',
        },
      })
      updateProviderSlot('openrouter', {
        status: 'ok',
        lastSuccessAt: new Date().toISOString(),
        lastError: undefined,
      })
      return { ok: true, message: '연결 성공', model: r.model, latencyMs: Date.now() - started }
    } catch (err) {
      const message = err instanceof Error ? err.message : '연결 실패'
      updateProviderSlot('openrouter', { status: 'error', lastError: message })
      return { ok: false, message }
    }
  },

  async sendChat(req: ProviderChatRequest): Promise<ProviderChatResult> {
    const slot = getProviderSlot('openrouter')
    const r = await openAiCompatibleChat({
      apiBase: OPENROUTER_API_BASE,
      apiKey: slot.apiKey,
      model: req.model || slot.model || OPENROUTER_DEFAULT_MODEL,
      messages: req.messages,
      signal: req.signal,
      extraHeaders: {
        'HTTP-Referer': 'https://jarvis-app.shipstatic.com',
        'X-Title': 'AIZIO',
      },
    })
    updateProviderSlot('openrouter', {
      status: 'ok',
      lastSuccessAt: new Date().toISOString(),
      lastError: undefined,
    })
    return { text: r.text, model: r.model, finishReason: r.finishReason, providerId: 'openrouter' }
  },
}
