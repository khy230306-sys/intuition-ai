import { describe, expect, it } from 'vitest'
import { localFunReply } from './localFun'

describe('localFunReply', () => {
  it('recommends lotto numbers without cloud', () => {
    const r = localFunReply('오늘의 로또번호 추천좀해줘')
    expect(r).toBeTruthy()
    expect(r!).toMatch(/로또/)
    expect(r!).toMatch(/재미용/)
    const nums = [...r!.matchAll(/\b(\d{1,2})\b/g)].map((m) => parseInt(m[1], 10))
    expect(nums.length).toBeGreaterThanOrEqual(6)
  })

  it('handles dice and coin', () => {
    expect(localFunReply('주사위')).toMatch(/주사위/)
    expect(localFunReply('동전 앞뒤')).toMatch(/동전/)
  })

  it('returns null for unrelated text', () => {
    expect(localFunReply('오늘 날씨 알려줘')).toBeNull()
  })
})
