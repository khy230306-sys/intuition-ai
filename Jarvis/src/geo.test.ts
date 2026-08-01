import { describe, expect, it } from 'vitest'
import { findCity, findCountry, formatCountry } from './geoData'
import { handleGeo, wantsGeo } from './geo'

describe('world geography', () => {
  it('resolves countries and cities', () => {
    expect(findCountry('프랑스')?.capital).toBe('파리')
    expect(findCountry('usa')?.name).toBe('미국')
    expect(findCity('도쿄')?.country).toBe('일본')
    expect(formatCountry(findCountry('브라질')!)).toContain('브라질리아')
  })

  it('answers geo intents', async () => {
    expect(wantsGeo('프랑스 정보')).toBe(true)
    const reply = await handleGeo('프랑스 수도')
    expect(reply?.text).toMatch(/파리/)
    const city = await handleGeo('도쿄 시차')
    expect(city?.text).toMatch(/도쿄|시차|좌표/)
  })

  it('does not treat device-location phrases as world geo', () => {
    expect(wantsGeo('현재 위치')).toBe(false)
    expect(wantsGeo('내 위치')).toBe(false)
    expect(wantsGeo('위치 알려줘')).toBe(false)
  })
})
