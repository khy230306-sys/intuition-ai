import { loadHybridAiConfig } from '../../ai-providers/providerConfig'
import { fallbackVisionResult, parseVisionResultJson } from '../visionSchema'
import type { VisionAnalyzeInput, VisionAnalyzeResult, VisionProvider } from '../types'
import { visionSystemPrompt, visionUserText } from './prompt'
import { visionChatCompletions } from './visionChat'

export const openAiVisionProvider: VisionProvider = {
  id: 'openai-vision',
  label: 'OpenAI Vision',
  isAvailable() {
    try {
      const cfg = loadHybridAiConfig()
      const slot = cfg.providers.openai
      return Boolean(slot?.enabled !== false && slot?.apiKey?.trim())
    } catch {
      return false
    }
  },
  async analyzeImage(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    const cfg = loadHybridAiConfig()
    const slot = cfg.providers.openai
    const key = slot?.apiKey?.trim() || ''
    if (!key) {
      return fallbackVisionResult(input.mode, 'openai-vision', 'OpenAI API 키가 없습니다.', 'no_key')
    }
    const model = slot?.model?.trim() || 'gpt-4o-mini'
    const base = (slot?.apiBase || 'https://api.openai.com/v1').replace(/\/$/, '')
    try {
      const r = await visionChatCompletions({
        apiBase: base,
        apiKey: key,
        model,
        signal: input.signal,
        system: visionSystemPrompt(input.mode),
        userText: visionUserText(input),
        imageDataUrl: input.imageDataUrl,
      })
      const parsed = parseVisionResultJson(r.text, input.mode, 'openai-vision')
      if (parsed) return { ...parsed, provider: 'openai-vision', model: r.model, ok: true }
      return fallbackVisionResult(
        input.mode,
        'openai-vision',
        'Vision 응답을 해석하지 못했어요. 다시 시도해 주세요.',
        'parse',
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OpenAI Vision 오류'
      return fallbackVisionResult(input.mode, 'openai-vision', msg, 'provider_error')
    }
  },
}
