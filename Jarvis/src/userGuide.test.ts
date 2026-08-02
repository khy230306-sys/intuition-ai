import { describe, expect, it } from 'vitest'
import { userGuideText, wantsUserGuide } from './userGuide'

describe('userGuide', () => {
  it('detects guide phrases', () => {
    expect(wantsUserGuide('사용설명서')).toBe(true)
    expect(wantsUserGuide('사용 설명서')).toBe(true)
    expect(wantsUserGuide('이 앱이 뭐야')).toBe(true)
    expect(wantsUserGuide('아이디어사용설명서')).toBe(true)
    expect(wantsUserGuide('시작 가이드')).toBe(true)
    expect(wantsUserGuide('도움말')).toBe(false)
    expect(wantsUserGuide('오늘 날씨')).toBe(false)
  })

  it('returns a short what-is-this-app guide', () => {
    const t = userGuideText('민수')
    expect(t).toContain('민수님')
    expect(t).toContain('AIZIO')
    expect(t).toContain('일상 비서')
    expect(t).toContain('오늘 날씨')
    expect(t).toContain('도움말')
    expect(t.length).toBeLessThan(900)
  })
})
