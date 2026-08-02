import { AiError, classifyHttpError, redactSecrets } from '../errors'
import type { AiChatMessage, AiProvider, AiRequest } from '../types'

export const openaiCompatibleProvider: AiProvider = {
  id: 'openai-compatible',
  label: 'OpenAI Compatible',

  isAvailable(req: AiRequest): boolean {
    return Boolean(req.apiKey?.trim())
  },

  async complete(req: AiRequest, messages: AiChatMessage[], signal: AbortSignal) {
    const apiKey = req.apiKey?.trim()
    if (!apiKey) {
      throw new AiError('config', 'API 키가 없습니다.', { retryable: false })
    }
    const base = (req.apiBase || 'https://api.openai.com/v1').replace(/\/$/, '')
    const model = req.model?.trim() || 'gpt-4o-mini'

    let res: Response
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.45,
        }),
        signal,
      })
    } catch (err) {
      if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        throw new AiError('cancelled', '요청이 취소되었습니다.', { retryable: false, cause: err })
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new AiError('offline', '오프라인', { retryable: false, cause: err })
      }
      throw new AiError('network', '네트워크 오류', { retryable: true, cause: err })
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw classifyHttpError(res.status, errText)
    }

    let data: {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      model?: string
    }
    try {
      data = (await res.json()) as typeof data
    } catch (err) {
      throw new AiError('bad_response', 'JSON 파싱 실패', { retryable: false, cause: err })
    }

    const text = data.choices?.[0]?.message?.content?.trim() || ''
    if (!text) {
      throw new AiError('bad_response', '빈 응답', { retryable: true })
    }

    return {
      text,
      model: data.model || model,
      finishReason: data.choices?.[0]?.finish_reason,
    }
  },
}

export function describeProviderError(err: unknown): string {
  if (err instanceof AiError) return `${err.kind}:${redactSecrets(err.message)}`
  if (err instanceof Error) return redactSecrets(err.message)
  return 'unknown'
}
