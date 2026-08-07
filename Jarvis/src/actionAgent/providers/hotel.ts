import type { HotelProvider, ProviderSearchRequest, ProviderSearchResponse } from './types'

type HotelProviderMode = 'demo' | 'live_ready' | 'live_missing_key'

function hotelProviderMode(): HotelProviderMode {
  try {
    const raw = localStorage.getItem('aizio_travel_services_v1')
    if (!raw) return 'demo'
    const p = JSON.parse(raw) as { hotelProvider?: string; expediaKey?: string; amadeusKey?: string }
    if (!p.hotelProvider || p.hotelProvider === 'demo') return 'demo'
    if (p.expediaKey || p.amadeusKey) return 'live_ready'
    return 'live_missing_key'
  } catch {
    return 'demo'
  }
}

function demoHotelResults(req: ProviderSearchRequest): ProviderSearchResponse {
  const dest = req.slots.destination || req.slots.location || '목적지'
  return {
    availability: 'SEARCH_AVAILABLE',
    message: `${dest} DEMO 호텔 후보예요. (실제 요금·재고는 여행 Provider 연결 후 조회됩니다)`,
    results: [
      { id: 'result_1', rank: 1, title: `${dest} 시내 호텔`, subtitle: 'DEMO · 18만원/박', meta: { provider: 'demo' } },
      { id: 'result_2', rank: 2, title: `${dest} 해변 리조트`, subtitle: 'DEMO · 22만원/박', meta: { provider: 'demo' } },
      { id: 'result_3', rank: 3, title: `${dest} 비즈니스 호텔`, subtitle: 'DEMO · 12만원/박', meta: { provider: 'demo' } },
    ],
  }
}

export const defaultHotelProvider: HotelProvider = {
  id: 'aizio-hotel-gate',
  async search(req: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    if (req.allowFixtures) return demoHotelResults(req)

    const mode = hotelProviderMode()
    if (mode === 'demo') return demoHotelResults(req)

    if (mode === 'live_missing_key') {
      return {
        availability: 'NEEDS_PROVIDER',
        results: [],
        message:
          '호텔 검색 정보는 준비됐어요. 설정하신 호텔 Provider API 키가 비어 있습니다. 설정 → 여행 서비스에서 키를 연결해 주세요. (또는 Provider를 DEMO로 두면 샘플 결과를 보여 드려요.)',
        errorCode: 'NEEDS_PROVIDER',
      }
    }

    return {
      availability: 'SEARCH_UNAVAILABLE',
      results: [],
      message: '호텔 Provider는 설정되어 있지만 Live 검색 어댑터가 아직 연결되지 않았습니다. Provider를 DEMO로 두면 샘플 결과를 바로 볼 수 있어요.',
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
