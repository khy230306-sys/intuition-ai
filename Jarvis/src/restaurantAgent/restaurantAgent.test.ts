import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeCommand } from '../commandRouter'
import { think } from '../brain'
import { clearInterpretMode } from '../translateBrain'
import { handleRestaurantAgent } from './agent'
import { clearRestaurantSession, loadRestaurantSession } from './session'
import { detectRestaurantIntent, isRecipeOrCooking } from './detect'
import { mockRestaurantProvider } from './providers/mockRestaurantProvider'
import {
  isExplicitRestaurantConfirm,
  isWeakRestaurantApproval,
  prepareRestaurantReservation,
  confirmRestaurantReservation,
} from './booking'
import { endTranslationSession } from '../commandRouter'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

describe('Restaurant intent routing', () => {
  beforeEach(() => {
    store.clear()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
  })

  it('distinguishes restaurant vs recipe vs weather vs flight', () => {
    expect(detectRestaurantIntent('삼산 맛집 알려줘')).toBe('RESTAURANT_SEARCH')
    expect(isRecipeOrCooking('김치찌개 만드는 법 알려줘')).toBe(true)
    expect(detectRestaurantIntent('김치찌개 만드는 법 알려줘')).toBe(null)
    expect(routeCommand({ text: '삼산 맛집 알려줘' }).intent).toBe('restaurant.search')
    expect(routeCommand({ text: '김치찌개 만드는 법 알려줘' }).intent).toBe('general.chat')
    expect(routeCommand({ text: '제주도 날씨 알려줘' }).intent).toBe('weather.query')
    expect(routeCommand({ text: '제주도 비행기 알아봐줘' }).intent).toBe('travel.flight.search')
  })
})

describe('Mock restaurant provider', () => {
  it('returns Ulsan Samsan Korean with parking filter', async () => {
    const res = await mockRestaurantProvider.searchRestaurants({
      location: '울산 삼산',
      cuisine: '한식',
      parking: true,
      time: '19:00',
      partySize: 4,
    })
    expect(res.demo).toBe(true)
    expect(res.offers.length).toBeGreaterThan(0)
    expect(res.offers.every((o) => o.parking)).toBe(true)
    expect(res.offers[0].recommendReason).toBeTruthy()
  })

  it('availability offers alternatives when slot missing', async () => {
    const res = await mockRestaurantProvider.searchRestaurants({ location: '울산 삼산', cuisine: '고깃집' })
    const meat = res.offers.find((o) => o.name.includes('불판')) || res.offers[0]
    const av = await mockRestaurantProvider.checkAvailability!({
      restaurantId: meat.id,
      date: '2026-08-10',
      time: '19:00',
      partySize: 4,
    })
    expect(av.available).toBe(false)
    expect(av.alternatives.length).toBeGreaterThan(0)
  })
})

describe('Natural language restaurant commands', () => {
  beforeEach(() => {
    store.clear()
    clearRestaurantSession()
    clearInterpretMode()
  })

  const cases = [
    '오늘 저녁 맛집 찾아줘',
    '울산 삼산 맛집',
    '7시에 네 명 예약 가능한 한식집',
    '주차되는 식당',
    '아이랑 갈 만한 곳',
    '조용한 곳',
    '룸 있는 식당',
  ]

  it.each(cases)('%s routes to restaurant', async (input) => {
    // Seed session for filter-only phrases
    if (/주차|아이|조용|룸/.test(input) && !/맛집|한식|삼산|저녁/.test(input)) {
      await handleRestaurantAgent('울산 삼산 맛집')
      await handleRestaurantAgent('4명')
      await handleRestaurantAgent('한식으로')
    }
    const r = await think(input)
    expect(r.text.length).toBeGreaterThan(3)
    expect(routeCommand({ text: input }).intent.startsWith('restaurant.') || loadRestaurantSession()).toBeTruthy()
  })
})

describe('Multi-turn family dinner in Samsan', () => {
  beforeEach(() => {
    store.clear()
    clearRestaurantSession()
    clearInterpretMode()
  })

  it('keeps context through search → filter → select → availability → prepare → confirm', async () => {
    const s1 = await handleRestaurantAgent('오늘 저녁 가족들이랑 외식하려고')
    expect(s1?.text).toMatch(/지역/)

    const s2 = await handleRestaurantAgent('울산 삼산')
    expect(s2?.text).toMatch(/명/)

    const s3 = await handleRestaurantAgent('4명')
    expect(s3?.text).toMatch(/음식|한식/)

    const s4 = await handleRestaurantAgent('한식으로')
    expect(s4?.text).toMatch(/DEMO|한식|식당|맛집/)
    expect(loadRestaurantSession()?.results.length).toBeGreaterThan(0)
    expect(loadRestaurantSession()?.partySize).toBe(4)

    const s5 = await handleRestaurantAgent('주차되는 곳만')
    expect(s5?.text).toMatch(/주차|DEMO|식당/)
    expect(loadRestaurantSession()?.results.every((r) => r.parking)).toBe(true)

    const s6 = await handleRestaurantAgent('두 번째')
    expect(s6?.restaurantIntent).toBe('RESTAURANT_SELECT')
    expect(loadRestaurantSession()?.selectedRestaurant).toBeTruthy()

    const s7 = await handleRestaurantAgent('7시 돼?')
    expect(s7?.text).toMatch(/예약|시간|DEMO|가능|없/)

    const s8 = await handleRestaurantAgent('그럼 예약해줘')
    expect(s8?.text).toMatch(/예약 준비|DEMO|예약할까요|필요/)

    expect(isWeakRestaurantApproval('좋네')).toBe(true)
    expect(isExplicitRestaurantConfirm('응 예약해')).toBe(true)

    const s9 = await handleRestaurantAgent('응 예약해')
    expect(s9?.text).toMatch(/DEMO|전화|예약|확인|페이지/)
    // Must not claim live external booking without provider
    expect(s9?.text).not.toMatch(/실제 외부 예약이 확정되었습니다$/)
  })
})

describe('Booking safety + calendar', () => {
  beforeEach(() => {
    store.clear()
    clearRestaurantSession()
  })

  it('prepare uses reservationAttemptId and confirm stays DEMO-honest', async () => {
    await handleRestaurantAgent('울산 삼산 맛집')
    await handleRestaurantAgent('4명')
    await handleRestaurantAgent('한식으로')
    await handleRestaurantAgent('첫 번째')
    const sess = loadRestaurantSession()!
    sess.selectedDate = '2026-08-10'
    sess.selectedTime = '19:00'
    sess.partySize = 4
    const preview = await prepareRestaurantReservation(sess)
    expect(preview.reservationAttemptId).toBeTruthy()
    const result = await confirmRestaurantReservation(
      { ...loadRestaurantSession()!, guestName: 'DEMO', guestPhone: '000' },
      true,
    )
    expect(result.message).toMatch(/DEMO|실제|전화|페이지/)
  })

  it('adds reservation to calendar on request', async () => {
    await handleRestaurantAgent('울산 삼산 맛집')
    await handleRestaurantAgent('4명')
    await handleRestaurantAgent('한식으로')
    await handleRestaurantAgent('첫 번째')
    const sess = loadRestaurantSession()!
    // patch via agent follow-up
    const { saveRestaurantSession } = await import('./session')
    saveRestaurantSession({
      ...sess,
      selectedDate: '2026-08-10',
      selectedTime: '19:00',
      partySize: 4,
    })
    const cal = await handleRestaurantAgent('예약 일정에 추가해줘')
    expect(cal?.text).toMatch(/일정/)
  })
})

describe('Travel regression still works', () => {
  beforeEach(() => {
    store.clear()
    clearRestaurantSession()
    clearInterpretMode()
    endTranslationSession()
  })

  it('flight search not stolen by restaurant router', async () => {
    expect(routeCommand({ text: '다음 주 금요일 제주 가는 비행기 찾아줘' }).intent).toBe(
      'travel.flight.search',
    )
  })
})
