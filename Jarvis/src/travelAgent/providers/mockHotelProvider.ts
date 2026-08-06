import type { HotelOffer } from '../schema'
import type { HotelBookingInput, HotelProvider, HotelSearchInput, HotelSearchResult } from './types'

type HotelSeed = Omit<HotelOffer, 'id' | 'pricedAt' | 'totalPrice' | 'pricePerNight' | 'nights' | 'checkIn' | 'checkOut'> & {
  baseNight: number
  city: string
}

const HOTELS: HotelSeed[] = [
  {
    provider: 'demo',
    name: '제주 오션뷰 리조트',
    imageUrl: '',
    locationLabel: '제주 중문',
    starRating: 4.5,
    guestScore: 8.9,
    roomName: '오션뷰 더블',
    taxesAndFees: 15000,
    currency: 'KRW',
    breakfast: true,
    cancellable: true,
    paymentTerms: '체크인 시 결제 (DEMO)',
    amenities: ['수영장', '바다전망', '주차', '조식'],
    seaView: true,
    pool: true,
    parking: true,
    priceKind: 'demo',
    baseNight: 185000,
    city: '제주',
  },
  {
    provider: 'demo',
    name: '제주 시티 호텔',
    imageUrl: '',
    locationLabel: '제주시 연동',
    starRating: 3.5,
    guestScore: 8.2,
    roomName: '스탠다드 트윈',
    taxesAndFees: 8000,
    currency: 'KRW',
    breakfast: false,
    cancellable: true,
    paymentTerms: '예약 시 결제 (DEMO)',
    amenities: ['와이파이', '주차'],
    seaView: false,
    pool: false,
    parking: true,
    priceKind: 'demo',
    baseNight: 98000,
    city: '제주',
  },
  {
    provider: 'demo',
    name: '애월 풀빌라',
    imageUrl: '',
    locationLabel: '제주 애월',
    starRating: 4.2,
    guestScore: 9.1,
    roomName: '프라이빗 풀 스위트',
    taxesAndFees: 22000,
    currency: 'KRW',
    breakfast: true,
    cancellable: false,
    paymentTerms: '전액 선결제 (DEMO)',
    amenities: ['수영장', '주차', '조식', '키즈'],
    seaView: false,
    pool: true,
    parking: true,
    priceKind: 'demo',
    baseNight: 210000,
    city: '제주',
  },
  {
    provider: 'demo',
    name: '오사카 난바 스테이',
    imageUrl: '',
    locationLabel: '오사카 난바',
    starRating: 4,
    guestScore: 8.6,
    roomName: '패밀리 룸',
    taxesAndFees: 18000,
    currency: 'KRW',
    breakfast: true,
    cancellable: true,
    paymentTerms: '호텔 현장 결제 (DEMO)',
    amenities: ['조식', '와이파이', '키즈'],
    seaView: false,
    pool: false,
    parking: false,
    priceKind: 'demo',
    baseNight: 165000,
    city: '오사카',
  },
  {
    provider: 'demo',
    name: '오사카 우메다 비즈니스',
    imageUrl: '',
    locationLabel: '오사카 우메다',
    starRating: 3.5,
    guestScore: 8.0,
    roomName: '트윈',
    taxesAndFees: 12000,
    currency: 'KRW',
    breakfast: false,
    cancellable: true,
    paymentTerms: '예약 시 결제 (DEMO)',
    amenities: ['와이파이'],
    seaView: false,
    pool: false,
    parking: false,
    priceKind: 'demo',
    baseNight: 120000,
    city: '오사카',
  },
  {
    provider: 'demo',
    name: '도쿄 베이사이드 호텔',
    imageUrl: '',
    locationLabel: '도쿄 오다이바',
    starRating: 4.3,
    guestScore: 8.8,
    roomName: '베이뷰 더블',
    taxesAndFees: 20000,
    currency: 'KRW',
    breakfast: true,
    cancellable: true,
    paymentTerms: '체크인 시 결제 (DEMO)',
    amenities: ['바다전망', '수영장', '조식'],
    seaView: true,
    pool: true,
    parking: false,
    priceKind: 'demo',
    baseNight: 240000,
    city: '도쿄',
  },
  {
    provider: 'demo',
    name: '부산 해운대 마린',
    imageUrl: '',
    locationLabel: '부산 해운대',
    starRating: 4.1,
    guestScore: 8.5,
    roomName: '오션 더블',
    taxesAndFees: 14000,
    currency: 'KRW',
    breakfast: true,
    cancellable: true,
    paymentTerms: '예약 시 결제 (DEMO)',
    amenities: ['바다전망', '수영장', '주차', '조식'],
    seaView: true,
    pool: true,
    parking: true,
    priceKind: 'demo',
    baseNight: 175000,
    city: '부산',
  },
]

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

function cityKey(dest: string): string {
  const d = dest.toLowerCase()
  if (/cju|제주/.test(d)) return '제주'
  if (/kix|osa|오사카/.test(d)) return '오사카'
  if (/nrt|hnd|tyo|도쿄|동경/.test(d)) return '도쿄'
  if (/pus|부산/.test(d)) return '부산'
  return ''
}

export class MockHotelProvider implements HotelProvider {
  id = 'demo'

  async searchHotels(input: HotelSearchInput): Promise<HotelSearchResult> {
    const city = cityKey(input.destination)
    const nights = nightsBetween(input.checkIn, input.checkOut)
    let list = HOTELS.filter((h) => !city || h.city === city)
    if (!list.length) list = HOTELS.filter((h) => h.city === '제주')

    if (input.seaView) list = list.filter((h) => h.seaView)
    if (input.pool) list = list.filter((h) => h.pool)
    if (input.breakfast) list = list.filter((h) => h.breakfast)
    if (input.parking) list = list.filter((h) => h.parking)
    if (input.starRatingMin) list = list.filter((h) => (h.starRating || 0) >= input.starRatingMin!)
    if (input.maxPricePerNight) list = list.filter((h) => h.baseNight <= input.maxPricePerNight!)

    const offers: HotelOffer[] = list.map((h, i) => {
      const perNight = h.baseNight
      const room = perNight * nights
      return {
        ...h,
        id: `demo-htl-${h.city}-${i + 1}`,
        nights,
        pricePerNight: perNight,
        totalPrice: room + h.taxesAndFees,
        pricedAt: new Date().toISOString(),
      }
    })

    offers.sort((a, b) => a.totalPrice - b.totalPrice)

    return {
      offers: offers.slice(0, 5),
      searchedAt: new Date().toISOString(),
      provider: 'demo',
      demo: true,
    }
  }

  async getHotelDetails(propertyId: string) {
    const res = await this.searchHotels({
      destination: '제주',
      checkIn: new Date().toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      adults: 2,
    })
    const hit = res.offers.find((o) => o.id === propertyId) || res.offers[0]
    return { ...hit, description: `${hit.name} — DEMO 상세 정보` }
  }

  async prepareBooking(input: HotelBookingInput) {
    const details = await this.getHotelDetails(input.offerId)
    return { offer: details, total: details.totalPrice, currency: details.currency }
  }

  async createBooking(input: HotelBookingInput) {
    return {
      bookingAttemptId: input.bookingAttemptId,
      status: 'CONFIRMED' as const,
      confirmationCode: `DEMO-HTL-${input.bookingAttemptId.slice(0, 8).toUpperCase()}`,
      hotelConfirmation: `H${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      message: 'DEMO 호텔 예약이 생성되었습니다. 실제 결제는 진행되지 않았습니다.',
      bookedAt: new Date().toISOString(),
    }
  }

  async getBooking(bookingId: string) {
    return {
      bookingAttemptId: bookingId,
      status: 'CONFIRMED' as const,
      confirmationCode: `DEMO-HTL-${bookingId.slice(0, 8).toUpperCase()}`,
      message: 'DEMO 호텔 예약 조회',
    }
  }

  async cancelBooking(bookingId: string) {
    return { ok: true, message: `DEMO 호텔 예약 ${bookingId.slice(0, 8)} 취소 처리(모의)` }
  }
}

export const mockHotelProvider = new MockHotelProvider()
