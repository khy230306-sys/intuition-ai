import type { FlightOffer } from '../schema'
import type { FlightBookingInput, FlightProvider, FlightSearchInput, FlightSearchResult } from './types'

function loc(code: string, name: string, city: string, country: string) {
  return { code, name, city, country, kind: 'airport' as const }
}

const ROUTES: Record<string, Array<Omit<FlightOffer, 'id' | 'pricedAt' | 'origin' | 'destination' | 'departAt' | 'arriveAt'> & { depH: number; depM: number; dur: number }>> = {
  'GMP-CJU': [
    { provider: 'demo', airline: '제주항공', airlineCode: '7C', flightNumber: '7C101', durationMinutes: 70, stops: 0, cabinClass: 'economy', baggage: '위탁 15kg', totalPrice: 0, pricePerPerson: 89000, currency: 'KRW', refundable: false, changeable: true, priceKind: 'demo', tags: ['직항', '최저가'], depH: 7, depM: 30, dur: 70 },
    { provider: 'demo', airline: '대한항공', airlineCode: 'KE', flightNumber: 'KE1101', durationMinutes: 65, stops: 0, cabinClass: 'economy', baggage: '위탁 20kg', totalPrice: 0, pricePerPerson: 128000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항', '추천'], depH: 9, depM: 10, dur: 65 },
    { provider: 'demo', airline: '아시아나항공', airlineCode: 'OZ', flightNumber: 'OZ8901', durationMinutes: 70, stops: 0, cabinClass: 'economy', baggage: '위탁 20kg', totalPrice: 0, pricePerPerson: 119000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항'], depH: 14, depM: 20, dur: 70 },
    { provider: 'demo', airline: '진에어', airlineCode: 'LJ', flightNumber: 'LJ501', durationMinutes: 75, stops: 0, cabinClass: 'economy', baggage: '기내 10kg', totalPrice: 0, pricePerPerson: 79000, currency: 'KRW', refundable: false, changeable: false, priceKind: 'demo', tags: ['직항', '최저가'], depH: 18, depM: 40, dur: 75 },
    { provider: 'demo', airline: '티웨이항공', airlineCode: 'TW', flightNumber: 'TW701', durationMinutes: 80, stops: 0, cabinClass: 'economy', baggage: '위탁 15kg', totalPrice: 0, pricePerPerson: 95000, currency: 'KRW', refundable: false, changeable: true, priceKind: 'demo', tags: ['직항', '저녁'], depH: 20, depM: 5, dur: 80 },
  ],
  'GMP-PUS': [
    { provider: 'demo', airline: '에어부산', airlineCode: 'BX', flightNumber: 'BX8101', durationMinutes: 60, stops: 0, cabinClass: 'economy', baggage: '위탁 15kg', totalPrice: 0, pricePerPerson: 69000, currency: 'KRW', refundable: false, changeable: true, priceKind: 'demo', tags: ['직항', '최저가'], depH: 8, depM: 0, dur: 60 },
    { provider: 'demo', airline: '대한항공', airlineCode: 'KE', flightNumber: 'KE1801', durationMinutes: 55, stops: 0, cabinClass: 'economy', baggage: '위탁 20kg', totalPrice: 0, pricePerPerson: 98000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항', '가장 빠름'], depH: 11, depM: 15, dur: 55 },
    { provider: 'demo', airline: '진에어', airlineCode: 'LJ', flightNumber: 'LJ321', durationMinutes: 65, stops: 0, cabinClass: 'economy', baggage: '기내 10kg', totalPrice: 0, pricePerPerson: 72000, currency: 'KRW', refundable: false, changeable: false, priceKind: 'demo', tags: ['직항'], depH: 16, depM: 45, dur: 65 },
  ],
  'ICN-NRT': [
    { provider: 'demo', airline: '대한항공', airlineCode: 'KE', flightNumber: 'KE703', durationMinutes: 140, stops: 0, cabinClass: 'economy', baggage: '위탁 23kg', totalPrice: 0, pricePerPerson: 289000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항', '추천'], depH: 9, depM: 20, dur: 140 },
    { provider: 'demo', airline: '아시아나항공', airlineCode: 'OZ', flightNumber: 'OZ101', durationMinutes: 145, stops: 0, cabinClass: 'economy', baggage: '위탁 23kg', totalPrice: 0, pricePerPerson: 275000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항'], depH: 13, depM: 40, dur: 145 },
    { provider: 'demo', airline: '일본항공', airlineCode: 'JL', flightNumber: 'JL92', durationMinutes: 150, stops: 0, cabinClass: 'economy', baggage: '위탁 23kg', totalPrice: 0, pricePerPerson: 310000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항'], depH: 18, depM: 10, dur: 150 },
    { provider: 'demo', airline: '피치항공', airlineCode: 'MM', flightNumber: 'MM808', durationMinutes: 155, stops: 0, cabinClass: 'economy', baggage: '기내 7kg', totalPrice: 0, pricePerPerson: 198000, currency: 'KRW', refundable: false, changeable: false, priceKind: 'demo', tags: ['직항', '최저가'], depH: 7, depM: 5, dur: 155 },
  ],
  'ICN-KIX': [
    { provider: 'demo', airline: '대한항공', airlineCode: 'KE', flightNumber: 'KE721', durationMinutes: 110, stops: 0, cabinClass: 'economy', baggage: '위탁 23kg', totalPrice: 0, pricePerPerson: 245000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항', '추천'], depH: 8, depM: 40, dur: 110 },
    { provider: 'demo', airline: '아시아나항공', airlineCode: 'OZ', flightNumber: 'OZ112', durationMinutes: 115, stops: 0, cabinClass: 'economy', baggage: '위탁 23kg', totalPrice: 0, pricePerPerson: 232000, currency: 'KRW', refundable: true, changeable: true, priceKind: 'demo', tags: ['직항'], depH: 12, depM: 15, dur: 115 },
    { provider: 'demo', airline: '제주항공', airlineCode: '7C', flightNumber: '7C1301', durationMinutes: 120, stops: 0, cabinClass: 'economy', baggage: '위탁 15kg', totalPrice: 0, pricePerPerson: 178000, currency: 'KRW', refundable: false, changeable: true, priceKind: 'demo', tags: ['직항', '최저가'], depH: 15, depM: 50, dur: 120 },
    { provider: 'demo', airline: '티웨이항공', airlineCode: 'TW', flightNumber: 'TW281', durationMinutes: 125, stops: 0, cabinClass: 'economy', baggage: '위탁 15kg', totalPrice: 0, pricePerPerson: 185000, currency: 'KRW', refundable: false, changeable: true, priceKind: 'demo', tags: ['직항'], depH: 19, depM: 30, dur: 125 },
    { provider: 'demo', airline: '피치항공', airlineCode: 'MM', flightNumber: 'MM18', durationMinutes: 200, stops: 1, cabinClass: 'economy', baggage: '기내 7kg', totalPrice: 0, pricePerPerson: 149000, currency: 'KRW', refundable: false, changeable: false, priceKind: 'demo', tags: ['경유', '최저가'], depH: 6, depM: 20, dur: 200 },
  ],
}

const AIRPORTS: Record<string, ReturnType<typeof loc>> = {
  GMP: loc('GMP', '김포국제공항', '서울', 'KR'),
  CJU: loc('CJU', '제주국제공항', '제주', 'KR'),
  PUS: loc('PUS', '김해국제공항', '부산', 'KR'),
  ICN: loc('ICN', '인천국제공항', '인천', 'KR'),
  NRT: loc('NRT', '나리타국제공항', '도쿄', 'JP'),
  HND: loc('HND', '하네다공항', '도쿄', 'JP'),
  KIX: loc('KIX', '간사이국제공항', '오사카', 'JP'),
}

function normalizeRoute(origin: string, destination: string): string {
  let o = origin.toUpperCase()
  let d = destination.toUpperCase()
  if (o === 'SEL') o = 'GMP'
  if (d === 'TYO') d = 'NRT'
  if (d === 'OSA') d = 'KIX'
  return `${o}-${d}`
}

function bandOf(h: number): 'morning' | 'afternoon' | 'evening' {
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export class MockFlightProvider implements FlightProvider {
  id = 'demo'

  async searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
    const key = normalizeRoute(input.origin, input.destination)
    const templates = ROUTES[key] || ROUTES['GMP-CJU']
    const pax = input.adults + (input.children || 0)
    const origin = AIRPORTS[key.split('-')[0]] || AIRPORTS.GMP
    const destination = AIRPORTS[key.split('-')[1]] || AIRPORTS.CJU
    const date = input.departureDate
    let offers: FlightOffer[] = templates.map((t, i) => {
      const dep = new Date(`${date}T${String(t.depH).padStart(2, '0')}:${String(t.depM).padStart(2, '0')}:00`)
      const arr = new Date(dep.getTime() + t.dur * 60000)
      const pp = t.pricePerPerson
      return {
        ...t,
        id: `demo-flt-${key}-${i + 1}`,
        origin,
        destination,
        departAt: dep.toISOString(),
        arriveAt: arr.toISOString(),
        durationMinutes: t.dur,
        pricePerPerson: pp,
        totalPrice: pp * Math.max(1, pax),
        pricedAt: new Date().toISOString(),
      }
    })

    if (input.directOnly) offers = offers.filter((o) => o.stops === 0)
    if (input.maxPrice) offers = offers.filter((o) => o.pricePerPerson <= input.maxPrice!)
    if (input.excludeAirline) {
      const ex = input.excludeAirline.toLowerCase()
      offers = offers.filter((o) => !o.airline.toLowerCase().includes(ex) && !(o.airlineCode || '').toLowerCase().includes(ex))
    }
    if (input.preferredTimeBand && input.preferredTimeBand !== 'any') {
      offers = offers.filter((o) => bandOf(new Date(o.departAt).getHours()) === input.preferredTimeBand)
    }

    // Deduplicate by flight number
    const seen = new Set<string>()
    offers = offers.filter((o) => {
      const k = `${o.airlineCode}-${o.flightNumber}-${o.departAt}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    if (input.sortBy === 'duration') offers.sort((a, b) => a.durationMinutes - b.durationMinutes)
    else if (input.sortBy === 'recommended')
      offers.sort((a, b) => {
        const score = (x: FlightOffer) =>
          (x.tags.includes('추천') ? -1000 : 0) + x.pricePerPerson + x.stops * 50000
        return score(a) - score(b)
      })
    else offers.sort((a, b) => a.pricePerPerson - b.pricePerPerson)

    // Tag cheapest / fastest among result set
    if (offers.length) {
      const cheapest = [...offers].sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0]
      const fastest = [...offers].sort((a, b) => a.durationMinutes - b.durationMinutes)[0]
      offers = offers.map((o) => ({
        ...o,
        tags: [
          ...new Set([
            ...o.tags,
            ...(o.id === cheapest.id ? ['최저가'] : []),
            ...(o.id === fastest.id ? ['가장 빠름'] : []),
            ...(o.stops === 0 ? ['직항'] : []),
          ]),
        ],
      }))
    }

    return {
      offers: offers.slice(0, 5),
      searchedAt: new Date().toISOString(),
      provider: 'demo',
      demo: true,
    }
  }

  async priceOffer(offerId: string): Promise<FlightOffer> {
    const parts = offerId.replace('demo-flt-', '').split('-')
    // Re-search approximate
    const origin = parts[0] || 'GMP'
    const dest = parts[1] || 'CJU'
    const res = await this.searchFlights({
      origin,
      destination: dest,
      departureDate: new Date().toISOString().slice(0, 10),
      adults: 1,
    })
    const hit = res.offers.find((o) => o.id === offerId) || res.offers[0]
    return { ...hit, pricedAt: new Date().toISOString(), priceKind: 'demo' }
  }

  async createBooking(input: FlightBookingInput) {
    return {
      bookingAttemptId: input.bookingAttemptId,
      status: 'CONFIRMED' as const,
      confirmationCode: `DEMO-FLT-${input.bookingAttemptId.slice(0, 8).toUpperCase()}`,
      flightPnr: `PNR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      message: 'DEMO 예약이 생성되었습니다. 실제 결제는 진행되지 않았습니다.',
      bookedAt: new Date().toISOString(),
    }
  }

  async getBooking(bookingId: string) {
    return {
      bookingAttemptId: bookingId,
      status: 'CONFIRMED' as const,
      confirmationCode: `DEMO-FLT-${bookingId.slice(0, 8).toUpperCase()}`,
      message: 'DEMO 예약 조회',
    }
  }

  async cancelBooking(bookingId: string) {
    return { ok: true, message: `DEMO 예약 ${bookingId.slice(0, 8)} 취소 처리(모의)` }
  }
}

export const mockFlightProvider = new MockFlightProvider()
