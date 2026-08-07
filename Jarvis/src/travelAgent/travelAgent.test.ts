import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeCommand } from '../commandRouter'
import { think } from '../brain'
import { setLegacyDemoProvidersEnabled } from '../featureTruth'
import { clearInterpretMode } from '../translateBrain'
import { handleTravelAgent } from './agent'
import { clearTravelSession, loadTravelSession } from './session'
import { detectTravelIntent } from './detect'
import { mockFlightProvider } from './providers/mockFlightProvider'
import { mockHotelProvider } from './providers/mockHotelProvider'
import { isExplicitBookingConfirm, isWeakApproval, prepareBooking, confirmBooking } from './booking'
import { loadTrips } from './trip'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

describe('Travel intent detection', () => {
  it('routes flight / hotel / plan / weather distinctly', () => {
    expect(detectTravelIntent('다음 주 금요일 제주 가는 비행기 찾아줘')).toBe('FLIGHT_SEARCH')
    expect(detectTravelIntent('다음 달에 오사카 3박4일 가족여행 준비해줘')).toBe('TRAVEL_PLAN')
    expect(detectTravelIntent('제주에서 바다 보이는 호텔 알아봐줘')).toBe('HOTEL_SEARCH')
    expect(detectTravelIntent('제주도 날씨 알려줘')).toBe(null)
    expect(routeCommand({ text: '제주도 날씨 알려줘' }).intent).toBe('weather.query')
    expect(routeCommand({ text: '제주도 비행기 알아봐줘' }).intent).toBe('travel.flight.search')
    expect(routeCommand({ text: '제주도 여행 일정 추천해줘' }).intent).toMatch(/travel\./)
  })
})

describe('Mock providers', () => {
  it('searches GMP-CJU flights without duplicate flight numbers', async () => {
    const res = await mockFlightProvider.searchFlights({
      origin: 'GMP',
      destination: 'CJU',
      departureDate: '2026-09-04',
      adults: 1,
    })
    expect(res.demo).toBe(true)
    expect(res.offers.length).toBeGreaterThanOrEqual(3)
    const keys = res.offers.map((o) => o.flightNumber)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('filters Jeju sea-view hotels under 200k/night', async () => {
    const res = await mockHotelProvider.searchHotels({
      destination: 'CJU',
      checkIn: '2026-09-10',
      checkOut: '2026-09-13',
      adults: 2,
      seaView: true,
      maxPricePerNight: 200000,
    })
    expect(res.offers.length).toBeGreaterThan(0)
    expect(res.offers.every((h) => h.seaView && h.pricePerNight <= 200000)).toBe(true)
  })
})

describe('Natural language travel commands', () => {
  beforeEach(() => {
    store.clear()
    clearTravelSession()
    clearInterpretMode()
    setLegacyDemoProvidersEnabled(true)
  })

  const cases: Array<{ input: string; intent: string }> = [
    { input: '다음 주 금요일 제주 가는 비행기 찾아줘', intent: 'travel.flight.search' },
    { input: '서울에서 부산 가장 싼 비행기', intent: 'travel.flight.search' },
    { input: '내일 도쿄 가는 직항', intent: 'travel.flight.search' },
    { input: '오사카 왕복 항공권 찾아줘', intent: 'travel.flight.search' },
    { input: '제주 호텔 알아봐줘', intent: 'travel.hotel.search' },
    { input: '바다 보이는 호텔', intent: 'travel.hotel.search' },
    { input: '수영장 있는 호텔', intent: 'travel.hotel.search' },
  ]

  it.each(cases)('$input → $intent', async ({ input, intent }) => {
    expect(routeCommand({ text: input }).intent).toBe(intent)
    const r = await think(input)
    expect(r.text.length).toBeGreaterThan(5)
    expect(r.text).not.toMatch(/날씨를 확인합니다/)
  })
})

describe('Multi-turn Osaka family trip', () => {
  beforeEach(() => {
    store.clear()
    clearTravelSession()
    clearInterpretMode()
    setLegacyDemoProvidersEnabled(true)
  })

  it('keeps context across plan → flight → hotel → summary → calendar', async () => {
    const s1 = await handleTravelAgent('다음 달 오사카 가려고')
    expect(s1?.travelIntent).toBe('TRAVEL_PLAN')
    expect(s1?.text).toMatch(/날짜/)

    const s2 = await handleTravelAgent('10일부터 13일까지')
    expect(s2?.text).toMatch(/명/)

    const s3 = await handleTravelAgent('가족 3명')
    expect(s3?.text).toMatch(/출발/)

    const s4 = await handleTravelAgent('인천 출발')
    expect(s4?.text).toMatch(/DEMO|항공|대한|제주항공|피치|아시아나/i)
    const sess = loadTravelSession()
    expect(sess?.origin?.code).toBe('ICN')
    expect(sess?.destination?.code).toBe('KIX')
    expect(sess?.travelers.adults).toBe(3)
    expect(sess?.flightSearchResults.length).toBeGreaterThan(0)

    const s5 = await handleTravelAgent('두 번째가 좋아')
    expect(s5?.travelIntent).toBe('FLIGHT_SELECT')
    expect(loadTravelSession()?.selectedFlight).toBeTruthy()

    const s6 = await handleTravelAgent('호텔도 찾아줘')
    expect(s6?.text).toMatch(/호텔|DEMO/)
    expect(loadTravelSession()?.hotelSearchResults.length).toBeGreaterThan(0)

    const s7 = await handleTravelAgent('20만원 이하로')
    expect(s7?.text).toMatch(/호텔|DEMO|조건/)

    const s8 = await handleTravelAgent('첫 번째')
    expect(s8?.travelIntent).toBe('HOTEL_SELECT')
    expect(loadTravelSession()?.selectedHotel).toBeTruthy()

    const s9 = await handleTravelAgent('전체 얼마야?')
    expect(s9?.text).toMatch(/총|예상/)

    const s10 = await handleTravelAgent('일정에 저장해줘')
    expect(s10?.text).toMatch(/일정/)
    expect(loadTrips().length).toBeGreaterThan(0)
  })
})

describe('Booking safety', () => {
  beforeEach(() => {
    store.clear()
    clearTravelSession()
    setLegacyDemoProvidersEnabled(true)
  })

  it('does not treat weak approval as payment confirm', () => {
    expect(isWeakApproval('좋네')).toBe(true)
    expect(isWeakApproval('괜찮아')).toBe(true)
    expect(isExplicitBookingConfirm('좋네')).toBe(false)
    expect(isExplicitBookingConfirm('응 예약해')).toBe(true)
  })

  it('prepare → explicit confirm stays DEMO without live charge', async () => {
    await handleTravelAgent('다음 주 금요일 제주 가는 비행기 찾아줘')
    await handleTravelAgent('편도')
    let sess = loadTravelSession()
    expect(sess?.flightSearchResults.length).toBeGreaterThan(0)
    await handleTravelAgent('첫 번째')
    sess = loadTravelSession()!
    const preview = await prepareBooking(sess)
    expect(preview.bookingAttemptId).toBeTruthy()
    expect(preview.grandTotal).toBeGreaterThan(0)
    const result = await confirmBooking(loadTravelSession()!, true)
    expect(result.message).toMatch(/실제 결제|DEMO/)
    expect(result.status).toBe('CONFIRMED')
  })
})

describe('Follow-up filters', () => {
  beforeEach(() => {
    store.clear()
    clearTravelSession()
    setLegacyDemoProvidersEnabled(true)
  })

  it('supports cheaper / direct / hotel details phrases', async () => {
    await handleTravelAgent('오사카 왕복 항공권 찾아줘')
    await handleTravelAgent('왕복')
    const cheap = await handleTravelAgent('더 싼 거 없어?')
    expect(cheap?.text).toMatch(/DEMO|항공|원/)
    const direct = await handleTravelAgent('직항만 보여줘')
    expect(direct?.text).toMatch(/직항|DEMO|항공/)
    await handleTravelAgent('호텔도 같이 알아봐')
    const detail = await handleTravelAgent('첫 번째 호텔 자세히')
    expect(detail?.text).toMatch(/호텔|상세|DEMO/)
  })
})
