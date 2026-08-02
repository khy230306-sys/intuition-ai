import { describe, expect, it } from 'vitest'
import {
  bigramSimilarity,
  detectEverydayIntent,
  looksLikeSttGarbage,
  normalizeCommandText,
  wantsWeatherCommand,
} from './spokenCommand'

describe('spokenCommand', () => {
  it('normalizes STT spacing', () => {
    expect(normalizeCommandText('오늘  날 씨 알려 줘')).toContain('날씨')
    expect(normalizeCommandText('알려 줘')).toBe('알려줘')
  })

  it('detects weather phrases without API key', () => {
    expect(wantsWeatherCommand('오늘 날씨 알려줘')).toBe(true)
    expect(wantsWeatherCommand('오늘날씨어때')).toBe(true)
    expect(wantsWeatherCommand('서울 날씨')).toBe(true)
    expect(wantsWeatherCommand('우산 챙길까')).toBe(true)
    expect(detectEverydayIntent('오늘 날씨 알려줘')).toEqual({ kind: 'weather', city: '' })
    expect(detectEverydayIntent('부산 날씨 어때')?.kind).toBe('weather')
    expect(detectEverydayIntent('부산 날씨 어때')).toMatchObject({ city: '부산' })
  })

  it('detects time / briefing / location / clear chat', () => {
    expect(detectEverydayIntent('지금 몇 시야')?.kind).toBe('time')
    expect(detectEverydayIntent('브리핑')?.kind).toBe('briefing')
    expect(detectEverydayIntent('내 위치')?.kind).toBe('location')
    expect(detectEverydayIntent('도움말')?.kind).toBe('help')
    expect(detectEverydayIntent('사용설명서')?.kind).toBe('userGuide')
    expect(detectEverydayIntent('이 앱이 뭐야')?.kind).toBe('userGuide')
    expect(detectEverydayIntent('대화삭제해줘')?.kind).toBe('clearChat')
    expect(detectEverydayIntent('채팅 삭제')?.kind).toBe('clearChat')
    expect(detectEverydayIntent('대화 초기화')?.kind).toBe('clearChat')
    expect(detectEverydayIntent('지난 대화 삭제')?.kind).toBe('clearChat')
  })

  it('flags STT garbage and scores similar seeds', () => {
    expect(looksLikeSttGarbage('대화식자제헤달')).toBe(true)
    expect(looksLikeSttGarbage('오늘 날씨 알려줘')).toBe(false)
    expect(looksLikeSttGarbage('넌 정말 최고의 비서야 👍')).toBe(false)
    expect(looksLikeSttGarbage('고마워')).toBe(false)
    expect(bigramSimilarity('오늘날씨알려줘', '오늘날씨어때')).toBeGreaterThan(0.4)
  })
})
