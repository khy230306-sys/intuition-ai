import { AiError } from '../../ai/errors'
import { classifyProviderBody } from '../providerErrors'
import type { ProviderChatMessage } from '../types'

export async function openAiCompatibleChat(opts: {
  apiBase: string
  apiKey: string
  model: string
  messages: ProviderChatMessage[]
  signal?: AbortSignal
  extraHeaders?: Record<string, string>
}): Promise<{ text: string; model: string; finishReason?: string }> {
  const apiKey = opts.apiKey.trim()
  if (!apiKey) {
    throw new AiError('config', 'API 키가 없습니다.', { retryable: false })
  }
  const base = opts.apiBase.replace(/\/$/, '')
  const model = opts.model.trim()
  if (!model) {
    throw new AiError('config', '모델이 비어 있습니다.', { retryable: false })
  }

  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(opts.extraHeaders || {}),
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: 0.45,
      }),
      signal: opts.signal,
    })
  } catch (err) {
    if (opts.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
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
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
    model?: string
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
}
