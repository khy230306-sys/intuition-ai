import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractEngineCity } from './aizioEngine/detect'
import { resolveCityCoords } from './aizioEngine/tools/weatherTool'
import { think } from './brain'
import { clearInterpretMode } from './translateBrain'
import { endTranslationSession } from './commandRouter'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR', geolocation: undefined })

describe('resolveCityCoords', () => {
  it('resolves Ho Chi Minh and Korea cities', () => {
    expect(resolveCityCoords('호치민')?.place).toBe('호치민')
    expect(resolveCityCoords('호치민시')?.lat).toBeCloseTo(10.82, 1)
    expect(resolveCityCoords('울산')?.place).toBe('울산')
    expect(resolveCityCoords('도쿄')?.place).toBe('도쿄')
  })
})

describe('extractEngineCity', () => {
  it('extracts Ho Chi Minh from weather asks', () => {
    expect(extractEngineCity('지금 호치민 날씨 좀 알려줘')).toBe('호치민')
    expect(extractEngineCity('내일 울산 비 와?')).toBe('울산')
  })
})

describe('weather chat reply', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    endTranslationSession()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('open-meteo.com')) {
          return {
            ok: true,
            json: async () => ({
              current: {
                temperature_2m: 31.4,
                weather_code: 2,
                precipitation_probability: 20,
              },
            }),
          }
        }
        throw new Error(`unexpected fetch ${url}`)
      }),
    )
  })

  it('puts Ho Chi Minh weather text in the chat reply (not only open link)', async () => {
    const r = await think('지금 호치민 날씨 좀 알려줘', [])
    expect(r.text).toMatch(/호치민/)
    expect(r.text).toMatch(/31|구름|맑음|흐림|°/)
    expect(r.text).not.toMatch(/날씨를 확인합니다/)
    expect(r.action).toBeUndefined()
  })
})
