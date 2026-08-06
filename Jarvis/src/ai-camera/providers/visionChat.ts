/**
 * Multimodal chat/completions helper for Vision.
 * Never logs image payloads or API keys.
 */

import { AiError } from '../../ai/errors'
import { classifyProviderBody } from '../../ai-providers/providerErrors'

export async function visionChatCompletions(opts: {
  apiBase: string
  apiKey: string
  model: string
  system: string
  userText: string
  imageDataUrl: string
  signal?: AbortSignal
  extraHeaders?: Record<string, string>
}): Promise<{ text: string; model: string }> {
  const apiKey = opts.apiKey.trim()
  if (!apiKey) throw new AiError('config', 'API 키가 없습니다.', { retryable: false })
  const base = opts.apiBase.replace(/\/$/, '')
  const model = opts.model.trim()
  if (!model) throw new AiError('config', '모델이 비어 있습니다.', { retryable: false })

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
        temperature: 0.2,
        messages: [
          { role: 'system', content: opts.system },
          {
            role: 'user',
            content: [
              { type: 'text', text: opts.userText },
              { type: 'image_url', image_url: { url: opts.imageDataUrl } },
            ],
          },
        ],
      }),
      signal: opts.signal,
    })
  } catch (err) {
    if (opts.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new AiError('cancelled', '분석이 취소되었습니다.', { retryable: false, cause: err })
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AiError('offline', '오프라인입니다. 연결 후 다시 시도해 주세요.', {
        retryable: true,
        cause: err,
      })
    }
    throw new AiError('network', '네트워크 오류', { retryable: true, cause: err })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    // Do not surface raw body that might echo content
    throw classifyProviderBody(res.status, errText.slice(0, 400))
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    model?: string
  }
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  if (!text) throw new AiError('bad_response', '빈 Vision 응답', { retryable: true })
  return { text, model: data.model || model }
}
