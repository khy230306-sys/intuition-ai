import type { FlightProvider, ProviderSearchRequest, ProviderSearchResponse } from './types'

type FlightProviderMode = 'demo' | 'live_ready' | 'live_missing_key'

function flightProviderMode(): FlightProviderMode {
  try {
    const raw = localStorage.getItem('aizio_travel_services_v1')
    if (!raw) return 'demo'
    const p = JSON.parse(raw) as { flightProvider?: string; duffelKey?: string; amadeusKey?: string }
    if (!p.flightProvider || p.flightProvider === 'demo') return 'demo'
    if (p.duffelKey || p.amadeusKey) return 'live_ready'
    return 'live_missing_key'
  } catch {
    return 'demo'
  }
}

function demoFlightResults(req: ProviderSearchRequest): ProviderSearchResponse {
  const dest = req.slots.destination || '목적지'
  const origin = req.slots.origin || '출발지'
  const date = req.slots.departureDate?.resolvedDate || '출발일'
  const trip = req.slots.tripType === 'round_trip' ? '왕복' : '편도'
  return {
    availability: 'SEARCH_AVAILABLE',
    message: `${origin} → ${dest} ${trip} DEMO 항공 후보예요. (${date} 기준 · 실제 요금·좌석은 여행 Provider 연결 후 조회됩니다)`,
    results: [
      {
        id: 'result_1',
        rank: 1,
        title: `대한항공 ${origin} → ${dest}`,
        subtitle: 'DEMO · 09:10 · 약 38만원',
        meta: { provider: 'demo', airline: '대한항공' },
      },
      {
        id: 'result_2',
        rank: 2,
        title: `아시아나 ${origin} → ${dest}`,
        subtitle: 'DEMO · 14:40 · 약 35만원',
        meta: { provider: 'demo', airline: '아시아나' },
      },
      {
        id: 'result_3',
        rank: 3,
        title: `베트남항공 ${origin} → ${dest}`,
        subtitle: 'DEMO · 19:05 · 약 29만원',
        meta: { provider: 'demo', airline: '베트남항공' },
      },
    ],
  }
}

/**
 * Production: DEMO when unset/demo provider (honest sample results).
 * NEEDS_PROVIDER only when user chose a live provider without API keys.
 */
export const defaultFlightProvider: FlightProvider = {
  id: 'aizio-flight-gate',
  async search(req: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    if (req.allowFixtures) return demoFlightResults(req)

    const mode = flightProviderMode()
    if (mode === 'demo') return demoFlightResults(req)

    if (mode === 'live_missing_key') {
      return {
        availability: 'NEEDS_PROVIDER',
        results: [],
        message:
          '항공 검색에 필요한 정보는 모았어요. 설정하신 항공 Provider API 키가 비어 있습니다. 설정 → 여행 서비스에서 키를 연결해 주세요. (또는 Provider를 DEMO로 두면 샘플 결과를 보여 드려요.)',
        errorCode: 'NEEDS_PROVIDER',
      }
    }

    return {
      availability: 'SEARCH_UNAVAILABLE',
      results: [],
      message: '항공 Provider는 설정되어 있지만 이 빌드에서는 Live 검색 어댑터가 아직 연결되지 않았습니다. Provider를 DEMO로 두면 샘플 결과를 바로 볼 수 있어요.',
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
