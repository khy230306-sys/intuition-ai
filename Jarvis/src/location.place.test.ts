import { describe, expect, it, vi } from 'vitest'
import {
  nearestKoreaCity,
  normalizeKoreaPlaceName,
  resolvePlaceLabel,
} from './location'

describe('GPS place label for weather/briefing', () => {
  it('normalizes metro names to short Korea cities', () => {
    expect(normalizeKoreaPlaceName('울산광역시')).toBe('울산')
    expect(normalizeKoreaPlaceName('서울특별시')).toBe('서울')
    expect(normalizeKoreaPlaceName('Ulsan')).toBe('울산')
    expect(normalizeKoreaPlaceName('Busan, South Korea')).toBe('부산')
  })

  it('picks 울산 for Ulsan coordinates (not 서울)', () => {
    expect(nearestKoreaCity(35.5384, 129.3114)).toBe('울산')
    expect(nearestKoreaCity(37.5665, 126.978)).toBe('서울')
    expect(nearestKoreaCity(35.55, 129.25)).toBe('울산')
  })

  it('resolvePlaceLabel offline falls back to nearest city', async () => {
    const prev = globalThis.navigator
    vi.stubGlobal('navigator', { ...(prev as object), onLine: false })
    await expect(resolvePlaceLabel(35.5384, 129.3114)).resolves.toBe('울산')
    vi.stubGlobal('navigator', prev)
  })
})
