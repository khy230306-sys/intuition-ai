import {
  getProviderSlot,
  hasAnyConfiguredProvider,
  type HybridProviderId,
  type ProviderSlotConfig,
} from './providerConfig'

export {
  getProviderSlot,
  updateProviderSlot,
  loadHybridAiConfig,
  hasAnyConfiguredProvider,
  type HybridProviderId,
  type ProviderSlotConfig,
  type HybridAiConfig,
} from './providerConfig'

export const LOCAL_NO_AI_MESSAGE =
  'AI API 키가 없습니다. CAMPUS 설정에서 OpenAI/Groq/OpenRouter 키를 연결해 주세요.'

export type HybridChatInput = {
  message: string
  history?: Array<{ role: string; text: string }>
  displayName?: string
  locale?: string
}

export type HybridChatOutput = {
  text: string
  providerId: HybridProviderId
  model: string
}

const ORDER: HybridProviderId[] = ['openrouter', 'gemini', 'groq', 'openai']

async function chatOpenAiCompatible(
  slot: ProviderSlotConfig,
  message: string,
): Promise<{ text: string; model: string }> {
  const base = (slot.apiBase || '').replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${slot.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: slot.model,
      messages: [
        {
          role: 'system',
          content:
            "You are AIZIO CAMPUS, a university study assistant. Answer in Korean unless asked otherwise. Never invent the student's timetable, assignments, or grades.",
        },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`AI ${res.status}: ${err.slice(0, 160)}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    model?: string
  }
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  if (!text) throw new Error('AI 응답이 비어 있습니다.')
  return { text, model: data.model || slot.model }
}

export async function runHybridChat(input: HybridChatInput): Promise<HybridChatOutput> {
  if (!hasAnyConfiguredProvider()) {
    throw new Error(LOCAL_NO_AI_MESSAGE)
  }
  const errors: string[] = []
  for (const id of ORDER) {
    const slot = getProviderSlot(id)
    if (!slot.apiKey.trim() || slot.enabled === false) continue
    try {
      const r = await chatOpenAiCompatible(slot, input.message)
      return { text: r.text, providerId: id, model: r.model }
    } catch (e) {
      errors.push(`${id}: ${e instanceof Error ? e.message : 'fail'}`)
    }
  }
  throw new Error(errors[0] || '사용 가능한 AI가 없습니다.')
}

export function hybridNoProviderMessage(): string {
  return LOCAL_NO_AI_MESSAGE
}
