import type { RestaurantOffer, RestaurantSearchInput } from '../schema'
import type {
  RestaurantAvailabilityInput,
  RestaurantProvider,
  RestaurantReservationInput,
  RestaurantSearchResult,
} from './types'

type Seed = Omit<RestaurantOffer, 'id' | 'recommendReason'> & { area: string }

const SEEDS: Seed[] = [
  {
    provider: 'demo',
    name: '삼산 한옥정',
    cuisine: '한식',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산로 120',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['18:00', '18:30', '19:00', '19:30', '20:00'],
    priceRange: '$$',
    pricePerPersonEst: 28000,
    rating: 4.6,
    reviewCount: 412,
    signatureMenus: ['된장찌개', '불고기정식', '모둠나물'],
    parking: true,
    childFriendly: true,
    privateRoom: true,
    wheelchairAccessible: true,
    atmosphere: ['quiet', 'family', 'parents'],
    phone: '052-123-4567',
    hoursLabel: '11:00–21:30',
    distanceKm: 0.8,
    depositRequired: false,
    cancellationPolicy: '방문 2시간 전까지 무료 취소 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '삼산 가마솥밥상',
    cuisine: '한식',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산로 66',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['18:00', '18:30', '20:00', '20:30'],
    priceRange: '$$',
    pricePerPersonEst: 24000,
    rating: 4.4,
    reviewCount: 301,
    signatureMenus: ['가마솥비빔밥', '김치찌개'],
    parking: true,
    childFriendly: true,
    privateRoom: false,
    wheelchairAccessible: false,
    atmosphere: ['family', 'casual'],
    phone: '052-111-2222',
    hoursLabel: '11:00–21:00',
    distanceKm: 1.0,
    depositRequired: false,
    cancellationPolicy: '방문 당일 취소 가능 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '삼산 불판이야기',
    cuisine: '고깃집',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산중로 45',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['17:30', '18:00', '18:30', '20:00', '20:30'],
    priceRange: '$$$',
    pricePerPersonEst: 45000,
    rating: 4.7,
    reviewCount: 890,
    signatureMenus: ['한우등심', '삼겹살', '된장찌개'],
    parking: true,
    childFriendly: true,
    privateRoom: false,
    atmosphere: ['lively', 'family'],
    phone: '052-234-5678',
    hoursLabel: '16:00–23:00',
    distanceKm: 1.1,
    depositRequired: true,
    depositAmount: 30000,
    cancellationPolicy: '예약금 환불: 당일 취소 시 불가 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '달빛 스시',
    cuisine: '일식',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산로 88',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['18:00', '19:00', '19:30', '21:00'],
    priceRange: '$$$',
    pricePerPersonEst: 52000,
    rating: 4.8,
    reviewCount: 256,
    signatureMenus: ['오마카세', '연어덮밥'],
    parking: false,
    childFriendly: false,
    privateRoom: true,
    atmosphere: ['quiet', 'date'],
    phone: '052-345-6789',
    hoursLabel: '12:00–22:00',
    distanceKm: 0.5,
    depositRequired: false,
    cancellationPolicy: '하루 전 취소 가능 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '중화루 삼산점',
    cuisine: '중식',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 돋질로 12',
    openNow: true,
    reservationSupported: false,
    reservationMode: 'phone',
    availableSlots: [],
    priceRange: '$',
    pricePerPersonEst: 12000,
    rating: 4.3,
    reviewCount: 1203,
    signatureMenus: ['짜장면', '짬뽕', '탕수육'],
    parking: true,
    childFriendly: true,
    privateRoom: false,
    atmosphere: ['casual', 'family'],
    phone: '052-456-7890',
    hoursLabel: '10:30–21:00',
    distanceKm: 1.4,
    depositRequired: false,
    cancellationPolicy: '전화 예약 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '블루플레이트 스테이크',
    cuisine: '양식',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산로 200',
    openNow: false,
    reservationSupported: true,
    reservationMode: 'deeplink',
    availableSlots: ['18:30', '19:30', '20:30'],
    priceRange: '$$$$',
    pricePerPersonEst: 78000,
    rating: 4.5,
    reviewCount: 188,
    signatureMenus: ['안심 스테이크', '파스타'],
    parking: true,
    childFriendly: false,
    privateRoom: true,
    atmosphere: ['quiet', 'date'],
    phone: '052-567-8901',
    bookingUrl: 'https://example.com/reserve/blueplate?demo=1',
    hoursLabel: '17:00–22:00 (오늘은 휴무 DEMO)',
    distanceKm: 2.0,
    depositRequired: true,
    depositAmount: 50000,
    cancellationPolicy: '예약금 전액 선결제 (DEMO)',
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '삼산 카페오름',
    cuisine: '카페',
    locationLabel: '울산 삼산동',
    address: '울산광역시 남구 삼산로 15',
    openNow: true,
    reservationSupported: false,
    reservationMode: 'none',
    availableSlots: [],
    priceRange: '$',
    pricePerPersonEst: 8000,
    rating: 4.4,
    reviewCount: 640,
    signatureMenus: ['아메리카노', '치즈케이크'],
    parking: true,
    childFriendly: true,
    privateRoom: false,
    atmosphere: ['casual', 'family'],
    phone: '052-678-9012',
    hoursLabel: '09:00–22:00',
    distanceKm: 0.3,
    depositRequired: false,
    priceKind: 'demo',
    area: '울산 삼산',
  },
  {
    provider: 'demo',
    name: '오사카 도톤보리 라멘',
    cuisine: '일식',
    locationLabel: '오사카 도톤보리',
    address: 'Osaka Dotonbori (DEMO)',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['18:00', '19:00', '20:00'],
    priceRange: '$$',
    pricePerPersonEst: 22000,
    rating: 4.4,
    reviewCount: 990,
    signatureMenus: ['돈코츠 라멘'],
    parking: false,
    childFriendly: true,
    privateRoom: false,
    atmosphere: ['casual'],
    phone: '+81-6-0000-0000',
    hoursLabel: '11:00–23:00',
    distanceKm: 0.6,
    depositRequired: false,
    cancellationPolicy: '당일 취소 가능 (DEMO)',
    priceKind: 'demo',
    area: '오사카',
  },
  {
    provider: 'demo',
    name: '성남 모란 한정식',
    cuisine: '한식',
    locationLabel: '성남 모란',
    address: '경기도 성남시 (DEMO)',
    openNow: true,
    reservationSupported: true,
    reservationMode: 'api',
    availableSlots: ['18:00', '19:00', '19:30'],
    priceRange: '$$',
    pricePerPersonEst: 32000,
    rating: 4.5,
    reviewCount: 210,
    signatureMenus: ['한정식'],
    parking: true,
    childFriendly: true,
    privateRoom: true,
    atmosphere: ['quiet', 'parents'],
    phone: '031-000-0000',
    hoursLabel: '11:30–21:00',
    distanceKm: 1.0,
    depositRequired: false,
    priceKind: 'demo',
    area: '성남',
  },
]

function matchArea(loc: string | undefined, area: string): boolean {
  if (!loc) return true
  const t = loc.replace(/\s+/g, '')
  const a = area.replace(/\s+/g, '')
  return t.includes(a) || a.includes(t) || t.includes('근처') || t.includes('near')
}

function reasonFor(o: RestaurantOffer, input: RestaurantSearchInput): string {
  const bits: string[] = []
  if (input.parking && o.parking) bits.push('주차가 가능합니다')
  if (input.childFriendly && o.childFriendly) bits.push('아이 동반에 무난합니다')
  if (input.preferredAtmosphere === 'quiet' && o.atmosphere.includes('quiet')) bits.push('조용한 분위기입니다')
  if (input.preferredAtmosphere === 'parents' || o.atmosphere.includes('parents')) {
    if (o.atmosphere.includes('parents') || o.atmosphere.includes('quiet')) bits.push('부모님과 가기 좋습니다')
  }
  if (input.privateRoom && o.privateRoom) bits.push('룸이 있습니다')
  if (input.time && o.availableSlots.includes(input.time)) bits.push(`${input.time} 예약이 가능합니다`)
  else if (input.time && o.reservationSupported && !o.availableSlots.includes(input.time)) {
    bits.push(`평점은 높지만 ${input.time} 예약이 없습니다`)
  }
  if (input.maxBudgetPerPerson && o.pricePerPersonEst && o.pricePerPersonEst <= input.maxBudgetPerPerson) {
    bits.push('예산에도 맞습니다')
  }
  if (!bits.length && o.rating) bits.push(`평점 ${o.rating}점대 추천입니다`)
  return bits.join('. ') + (bits.length ? '.' : '')
}

export class MockRestaurantProvider implements RestaurantProvider {
  id = 'demo'

  async searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantSearchResult> {
    let list = SEEDS.filter((s) => matchArea(input.location, s.area))
    if (!list.length) list = SEEDS.filter((s) => s.area.includes('울산') || s.area.includes('삼산'))

    if (input.cuisine) {
      const c = input.cuisine
      list = list.filter((s) => s.cuisine.includes(c) || (c === '한식' && s.cuisine === '한식'))
    }
    if (input.parking) list = list.filter((s) => s.parking)
    if (input.childFriendly) list = list.filter((s) => s.childFriendly)
    if (input.privateRoom) list = list.filter((s) => s.privateRoom)
    if (input.openNow) list = list.filter((s) => s.openNow)
    if (input.ratingMin) list = list.filter((s) => (s.rating || 0) >= input.ratingMin!)
    if (input.maxBudgetPerPerson) {
      list = list.filter((s) => (s.pricePerPersonEst || 0) <= input.maxBudgetPerPerson!)
    }
    if (input.preferredAtmosphere) {
      const a = input.preferredAtmosphere
      list = list.filter((s) => s.atmosphere.includes(a) || (a === 'quiet' && s.atmosphere.includes('quiet')))
    }
    if (input.keywords?.length) {
      list = list.filter((s) =>
        input.keywords!.some(
          (k) => s.name.includes(k) || s.signatureMenus.some((m) => m.includes(k)) || s.cuisine.includes(k),
        ),
      )
    }

    if (input.sortBy === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (input.sortBy === 'distance') list = [...list].sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99))
    else if (input.sortBy === 'price')
      list = [...list].sort((a, b) => (a.pricePerPersonEst || 0) - (b.pricePerPersonEst || 0))
    else {
      list = [...list].sort((a, b) => {
        const score = (x: Seed) =>
          (x.rating || 0) * 10 +
          (input.time && x.availableSlots.includes(input.time) ? 20 : 0) +
          (input.parking && x.parking ? 5 : 0) -
          (x.distanceKm || 0)
        return score(b) - score(a)
      })
    }

    const offers: RestaurantOffer[] = list.slice(0, 5).map((s) => {
      const slug = s.name.replace(/\s+/g, '')
      const offer: RestaurantOffer = {
        ...s,
        id: `demo-rst-${slug}`,
      }
      offer.recommendReason = reasonFor(offer, input)
      return offer
    })

    return {
      offers,
      searchedAt: new Date().toISOString(),
      provider: 'demo',
      demo: true,
    }
  }

  private findSeedById(restaurantId: string): RestaurantOffer {
    const seed =
      SEEDS.find((s) => restaurantId === `demo-rst-${s.name.replace(/\s+/g, '')}`) ||
      SEEDS.find((s) => restaurantId.includes(s.name.replace(/\s+/g, ''))) ||
      SEEDS[0]
    return {
      ...seed,
      id: restaurantId,
      recommendReason: undefined,
    }
  }

  async getRestaurantDetails(restaurantId: string) {
    const base = this.findSeedById(restaurantId)
    return { ...base, description: `${base.name} — DEMO 상세` }
  }

  async checkAvailability(input: RestaurantAvailabilityInput) {
    const details = this.findSeedById(input.restaurantId)
    const slots = details.availableSlots || []
    const available = slots.includes(input.time)
    const alternatives = available ? [] : slots.filter((t) => t !== input.time).slice(0, 3)
    return {
      available,
      requestedTime: input.time,
      alternatives,
      message: available
        ? `${input.time} 예약 가능합니다. (DEMO)`
        : `${input.time}는 예약이 없습니다. 가까운 시간: ${alternatives.join(', ') || '없음'} (DEMO)`,
    }
  }

  async createReservation(input: RestaurantReservationInput) {
    const details = await this.getRestaurantDetails(input.restaurantId)
    if (details.reservationMode === 'phone') {
      return {
        reservationAttemptId: input.reservationAttemptId,
        status: 'PHONE_REQUIRED' as const,
        restaurantName: details.name,
        address: details.address,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        provider: 'demo',
        contact: details.phone,
        message: `전화 예약이 필요합니다. ${details.phone || ''} · ${details.hoursLabel || ''} (DEMO — 통화/예약 완료를 가장하지 않습니다)`,
      }
    }
    if (details.reservationMode === 'deeplink') {
      return {
        reservationAttemptId: input.reservationAttemptId,
        status: 'FAILED' as const,
        restaurantName: details.name,
        bookingUrl: details.bookingUrl,
        message: 'API 예약이 없어 예약 페이지를 열어 주세요. (DEMO — 자동 예약 완료로 표시하지 않습니다)',
        provider: 'demo',
      }
    }
    return {
      reservationAttemptId: input.reservationAttemptId,
      status: 'CONFIRMED' as const,
      confirmationNumber: `DEMO-RST-${input.reservationAttemptId.slice(0, 8).toUpperCase()}`,
      restaurantName: details.name,
      address: details.address,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      provider: 'demo',
      cancellationPolicy: details.cancellationPolicy,
      contact: details.phone,
      message:
        'DEMO 예약이 기록되었습니다. 실제 외부 예약 Provider가 없어 현장 예약이 확정된 것은 아닙니다.',
      reservedAt: new Date().toISOString(),
    }
  }

  async getReservation(reservationId: string) {
    return {
      reservationAttemptId: reservationId,
      status: 'CONFIRMED' as const,
      confirmationNumber: `DEMO-RST-${reservationId.slice(0, 8).toUpperCase()}`,
      message: 'DEMO 예약 조회',
      provider: 'demo',
    }
  }

  async cancelReservation(reservationId: string) {
    return { ok: true, message: `DEMO 예약 ${reservationId.slice(0, 8)} 취소 처리(모의)` }
  }
}

export const mockRestaurantProvider = new MockRestaurantProvider()
