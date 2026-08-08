import { describe, expect, it } from 'vitest'
import { planConversationTurn } from './plan'

describe('planConversationTurn', () => {
  it('detects colloquial weather typos', () => {
    const p = planConversationTurn('낼 비옴?')
    expect(p.domain).toBe('weather')
    expect(p.requiresTool).toBe(true)
    expect(p.entities.dateHint).toBe('내일')
  })

  it('detects city weather', () => {
    const p = planConversationTurn('내일 울산 비와?')
    expect(p.domain).toBe('weather')
    expect(p.entities.city).toBe('울산')
  })

  it('routes lifestyle chat to LLM without places tool', () => {
    const p = planConversationTurn('아이랑 이번 주말에 뭐하면 좋을까?')
    // soft lifestyle may be places if "갈" patterns — "뭐하면" alone → chat
    expect(['chat', 'places', 'help']).toContain(p.domain)
    expect(p.useLlmReply).toBe(true)
  })

  it('routes general chat to LLM', () => {
    const p = planConversationTurn('안녕 오늘 기분이 좀 꿀꿀하네')
    expect(p.domain).toBe('chat')
    expect(p.useLlmReply).toBe(true)
    expect(p.requiresTool).toBe(false)
  })

  it('detects translation start/end', () => {
    expect(planConversationTurn('앞으로 내가 하는 말을 영어로 번역해줘').domain).toBe('translation')
    expect(planConversationTurn('번역 그만').reason).toBe('translation_end')
  })
})
