import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aizioLocalChat, shouldUseAizioLocalChat } from './localConversation'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

describe('AIZIO built-in conversation', () => {
  beforeEach(() => store.clear())

  it('greets without stock/briefing pitches', async () => {
    const r = await aizioLocalChat({ text: '안녕', displayName: '주인님' })
    expect(r.text).toMatch(/안녕/)
    expect(r.text).not.toMatch(/브리핑|삼성전자|시세/)
  })

  it('explains identity as AIZIO without requiring API keys', async () => {
    const r = await aizioLocalChat({ text: '너 누구야', displayName: '주인님' })
    expect(r.text).toMatch(/AIZIO|아이지오|비서/)
    expect(r.text).toMatch(/API\s*키|키를 넣지/)
  })

  it('tells a joke on request', async () => {
    const r = await aizioLocalChat({ text: '농담해줘' })
    expect(r.text.length).toBeGreaterThan(8)
    expect(r.text).not.toMatch(/음성을 잘 듣지/)
  })

  it('shouldUseAizioLocalChat accepts normal Korean chat', () => {
    expect(shouldUseAizioLocalChat('심심해')).toBe(true)
    expect(shouldUseAizioLocalChat('')).toBe(false)
  })
})
