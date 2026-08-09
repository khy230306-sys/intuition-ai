import type { SearchResultItem } from '../types'
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

/** Destination-aware browse tips — not live rates; unblocks search UX when API is off. */
function browseHotelGuide(dest: string): SearchResultItem[] {
  const d = dest.trim() || '목적지'
  if (/나트랑|냐짱|Nha\s*Trang/i.test(d)) {
    return [
      {
        id: 'result_1',
        rank: 1,
        title: `${d} 해변·논트랑 리조트 존`,
        subtitle: '바다전망·수영장 · 가족 휴양',
        meta: { area: 'beach', kind: 'resort' },
      },
      {
        id: 'result_2',
        rank: 2,
        title: `${d} 시내·야시장 근처 호텔`,
        subtitle: '중심가 워킹 · 가성비',
        meta: { area: 'downtown', kind: 'hotel' },
      },
      {
        id: 'result_3',
        rank: 3,
        title: `${d} 빈펄·고급 리조트`,
        subtitle: '올인클루시브·액티비티 · 사전 예약 권장',
        meta: { area: 'vinpearl', kind: 'resort' },
      },
    ]
  }
  if (/다낭|호이안/.test(d)) {
    return [
      {
        id: 'result_1',
        rank: 1,
        title: `${d} 미케 비치 리조트`,
        subtitle: '해변 인접 · 수영장',
        meta: { kind: 'resort' },
      },
      {
        id: 'result_2',
        rank: 2,
        title: `${d} 한강·시내 호텔`,
        subtitle: '시내 접근 · 야시장',
        meta: { kind: 'hotel' },
      },
      {
        id: 'result_3',
        rank: 3,
        title: `${d} 호이안 올드타운 숙소`,
        subtitle: '고즈넉 · 걷기 좋은 위치',
        meta: { kind: 'hotel' },
      },
    ]
  }
  if (/제주/.test(d)) {
    return [
      {
        id: 'result_1',
        rank: 1,
        title: `${d} 중문·오션뷰 리조트`,
        subtitle: '바다전망 · 수영장',
        meta: { kind: 'resort' },
      },
      {
        id: 'result_2',
        rank: 2,
        title: `${d} 시내·연동 호텔`,
        subtitle: '렌터카·쇼핑 접근',
        meta: { kind: 'hotel' },
      },
      {
        id: 'result_3',
        rank: 3,
        title: `${d} 애월·협재 풀빌라`,
        subtitle: '프라이빗 · 가족',
        meta: { kind: 'villa' },
      },
    ]
  }
  return [
    {
      id: 'result_1',
      rank: 1,
      title: `${d} 시내 호텔`,
      subtitle: '중심가 · 교통 편리',
      meta: { kind: 'hotel' },
    },
    {
      id: 'result_2',
      rank: 2,
      title: `${d} 해변·리조트`,
      subtitle: '휴양 · 수영장',
      meta: { kind: 'resort' },
    },
    {
      id: 'result_3',
      rank: 3,
      title: `${d} 가성비 숙소`,
      subtitle: '단기 체류 · 후기 좋은 편',
      meta: { kind: 'hotel' },
    },
  ]
}

function browseHotelResults(req: ProviderSearchRequest): ProviderSearchResponse {
  const dest = req.slots.destination || req.slots.location || '목적지'
  const checkIn = req.slots.checkIn?.resolvedDate || req.slots.departureDate?.resolvedDate || ''
  const checkOut = req.slots.checkOut?.resolvedDate || req.slots.returnDate?.resolvedDate || ''
  const when =
    checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : checkIn ? ` · 체크인 ${checkIn}` : ''
  return {
    availability: 'SEARCH_AVAILABLE',
    message:
      `${dest} 호텔·리조트 참고 요약이에요${when}.\n` +
      `실시간 요금·재고는 지도/예약 사이트에서 확인하세요. 예: 지도에 「${dest} 리조트」`,
    results: browseHotelGuide(dest),
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
    if (mode === 'demo') {
      // Browse summary instead of empty NEEDS_PROVIDER — stops the check-in Q&A dead-end
      return browseHotelResults(req)
    }

    if (mode === 'live_missing_key') {
      const browse = browseHotelResults(req)
      return {
        ...browse,
        message:
          `${browse.message}\n\n` +
          '설정하신 호텔 Provider API 키가 비어 있습니다. 실 → Travel Services에서 키를 연결하면 실시간 요금을 붙일 수 있어요.',
      }
    }

    return {
      availability: 'SEARCH_UNAVAILABLE',
      results: [],
      message:
        '호텔 Provider는 설정되어 있지만 Live 검색 어댑터가 아직 연결되지 않아 실제 호텔을 조회할 수 없습니다.',
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
