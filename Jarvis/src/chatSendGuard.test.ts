import { describe, expect, it } from 'vitest'
import { nextChatSendGuard, shouldAcceptChatSend } from './chatSendGuard'

describe('chatSendGuard', () => {
  it('rejects empty or busy', () => {
    expect(shouldAcceptChatSend('', false, null)).toBe(false)
    expect(shouldAcceptChatSend('안녕', true, null)).toBe(false)
  })

  it('accepts first send then rejects rapid duplicate', () => {
    const t0 = 1_000_000
    expect(shouldAcceptChatSend('여기는 정말 아름다운 곳이에요', false, null, t0)).toBe(true)
    const last = nextChatSendGuard('여기는 정말 아름다운 곳이에요', t0)
    expect(shouldAcceptChatSend('여기는 정말 아름다운 곳이에요', false, last, t0 + 200)).toBe(false)
    expect(shouldAcceptChatSend('여기는 정말 아름다운 곳이에요', false, last, t0 + 2000)).toBe(true)
  })

  it('allows a different sentence immediately', () => {
    const t0 = 1_000_000
    const last = nextChatSendGuard('첫번째', t0)
    expect(shouldAcceptChatSend('두번째', false, last, t0 + 50)).toBe(true)
  })
})
