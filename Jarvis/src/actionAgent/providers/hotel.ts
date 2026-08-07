import type { HotelProvider, ProviderSearchRequest, ProviderSearchResponse } from './types'

function liveKeysConfigured(): boolean {
  try {
    const raw = localStorage.getItem('aizio_travel_services_v1')
    if (!raw) return false
    const p = JSON.parse(raw) as { hotelProvider?: string; expediaKey?: string; amadeusKey?: string }
    if (p.hotelProvider === 'demo' || !p.hotelProvider) return false
    return Boolean(p.expediaKey || p.amadeusKey)
  } catch {
    return false
  }
}

export const defaultHotelProvider: HotelProvider = {
  id: 'aizio-hotel-gate',
  async search(req: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    if (req.allowFixtures) {
      const dest = req.slots.destination || req.slots.location || '목적지'
      return {
        availability: 'SEARCH_AVAILABLE',
        message: `테스트용 호텔 후보 · ${dest}`,
        results: [
          { id: 'result_1', rank: 1, title: `${dest} 시내 호텔`, subtitle: 'fixture · 18만원/박' },
          { id: 'result_2', rank: 2, title: `${dest} 해변 리조트`, subtitle: 'fixture · 22만원/박' },
          { id: 'result_3', rank: 3, title: `${dest} 비즈니스 호텔`, subtitle: 'fixture · 12만원/박' },
        ],
      }
    }
    if (!liveKeysConfigured()) {
      return {
        availability: 'NEEDS_PROVIDER',
        results: [],
        message:
          '호텔 검색 정보는 준비됐어요. 현재 호텔 검색 제공자가 연결되지 않았습니다. 설정 → 여행 서비스에서 Provider를 연결해 주세요.',
        errorCode: 'NEEDS_PROVIDER',
      }
    }
    return {
      availability: 'SEARCH_UNAVAILABLE',
      results: [],
      message: '호텔 Provider는 설정되어 있지만 Live 검색 어댑터가 아직 연결되지 않았습니다.',
      errorCode: 'SEARCH_UNAVAILABLE',
    }
  },
}

let injected: HotelProvider | null = null
export function getHotelProvider(): HotelProvider {
  return injected || defaultHotelProvider
}
export function setHotelProviderForTests(p: HotelProvider | null): void {
  injected = p
}
