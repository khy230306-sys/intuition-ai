import { loadHybridAiConfig } from '../../ai-providers/providerConfig'
import { fallbackVisionResult, parseVisionResultJson } from '../visionSchema'
import type { VisionAnalyzeInput, VisionAnalyzeResult, VisionProvider } from '../types'
import { visionSystemPrompt, visionUserText } from './prompt'
import { visionChatCompletions } from './visionChat'

const DEFAULT_VISION_MODEL = 'openai/gpt-4o-mini'

export const openRouterVisionProvider: VisionProvider = {
  id: 'openrouter-vision',
  label: 'OpenRouter Vision',
  isAvailable() {
    try {
      const cfg = loadHybridAiConfig()
      const slot = cfg.providers.openrouter
      return Boolean(slot?.enabled !== false && slot?.apiKey?.trim())
    } catch {
      return false
    }
  },
  async analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    const cfg = loadHybridAiConfig()
    const slot = cfg.providers.openrouter
    const key = slot?.apiKey?.trim() || ''
    if (!key) {
      return fallbackVisionResult(
        input.mode,
        'openrouter-vision',
        'OpenRouter API 키가 없습니다.',
        'no_key',
      )
    }
    const model = slot?.model?.trim() || DEFAULT_VISION_MODEL
    try {
      const r = await visionChatCompletions({
        apiBase: 'https://openrouter.ai/api/v1',
        apiKey: key,
        model,
        signal: input.signal,
        system: visionSystemPrompt(input.mode),
        userText: visionUserText(input),
        imageDataUrl: input.imageDataUrl,
        extraHeaders: {
          'HTTP-Referer': 'https://jarvis-app.shipstatic.com',
          'X-Title': 'AIZIO',
        },
      })
      const parsed = parseVisionResultJson(r.text, input.mode, 'openrouter-vision')
      if (parsed) return { ...parsed, provider: 'openrouter-vision', model: r.model, ok: true }
      return fallbackVisionResult(
        input.mode,
        'openrouter-vision',
        'Vision 응답을 해석하지 못했어요.',
        'parse',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OpenRouter Vision 오류'
      return fallbackVisionResult(input.mode, 'openrouter-vision', msg, 'provider_error')
    }
  },
}
