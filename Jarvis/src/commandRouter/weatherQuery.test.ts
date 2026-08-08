import { describe, expect, it } from 'vitest'
import { isClearWeatherQuery } from './weatherQuery'

describe('isClearWeatherQuery colloquial', () => {
  it('accepts 낼 비옴?', () => {
    expect(isClearWeatherQuery('낼 비옴?')).toBe(true)
  })

  it('accepts 내일 울산 비와?', () => {
    expect(isClearWeatherQuery('내일 울산 비와?')).toBe(true)
  })

  it('rejects weather opinions', () => {
    expect(isClearWeatherQuery('오늘 날씨 정말 좋다')).toBe(false)
  })

  it('rejects translate-framed weather', () => {
    expect(isClearWeatherQuery('오늘 날씨 좋다고 영어로 번역해줘')).toBe(false)
  })

  it('matches place + 날씨는? without ask verb', () => {
    expect(isClearWeatherQuery('호치민 날씨는?')).toBe(true)
    expect(isClearWeatherQuery('울산 날씨?')).toBe(true)
  })
})
