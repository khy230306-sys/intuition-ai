import type { FlightProvider, ProviderSearchRequest, ProviderSearchResponse } from './types'

function liveKeysConfigured(): boolean {
  try {
    const raw = localStorage.getItem('aizio_travel_services_v1')
    if (!raw) return false
    const p = JSON.parse(raw) as { flightProvider?: string; duffelKey?: string; amadeusKey?: string }
    if (p.flightProvider === 'demo' || !p.flightProvider) return false
    return Boolean(p.duffelKey || p.amadeusKey)
  } catch {
    return false
  }
}

/** Production-safe: never invent flights without a real provider. */
export const defaultFlightProvider: FlightProvider = {
  id: 'aizio-flight-gate',
  async search(req: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    if (req.allowFixtures) {
      const dest = req.slots.destination || '목적지'
      const origin = req.slots.origin || '출발지'
      return {
        availability: 'SEARCH_AVAILABLE',
        message: `테스트용 항공 후보 ${origin} → ${dest}`,
        results: [
          {
            id: 'result_1',
            rank: 1,
            title: `${origin} → ${dest} 오전편`,
            subtitle: 'fixture · 09:10',
            meta: { provider: 'fixture' },
          },
          {
            id: 'result_2',
            rank: 2,
            title: `${origin} → ${dest} 오후편`,
            subtitle: 'fixture · 14:40',
            meta: { provider: 'fixture' },
          },
          {
            id: 'result_3',
            rank: 3,
            title: `${origin} → ${dest} 저녁편`,
            subtitle: 'fixture · 19:05',
            meta: { provider: 'fixture' },
          },
        ],
      }
    }
    if (!liveKeysConfigured()) {
      return {
        availability: 'NEEDS_PROVIDER',
        results: [],
        message:
          '항공 검색에 필요한 정보는 모았어요. 현재 항공 검색 제공자가 연결되지 않았습니다. 설정 → 여행 서비스에서 Provider API 키를 연결해 주세요.',
        errorCode: 'NEEDS_PROVIDER',
      }
    }
    return {
      availability: 'SEARCH_UNAVAILABLE',
      results: [],
      message: '항공 Provider는 설정되어 있지만 이 빌드에서는 Live 검색 어댑터가 아직 연결되지 않았습니다.',
      errorCode: 'SEARCH_UNAVAILABLE',
    }
  },
}

let injected: FlightProvider | null = null

export function getFlightProvider(): FlightProvider {
  return injected || defaultFlightProvider
}

export function setFlightProviderForTests(p: FlightProvider | null): void {
  injected = p
}
