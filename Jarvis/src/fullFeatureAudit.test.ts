/**
 * Cross-feature regression audit — everyday + travel/restaurant/howto traps.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from './brain'
import { clearInterpretMode } from './translateBrain'
import {
  endTranslationSession,
  routeCommand,
  startTranslationSession,
} from './commandRouter'
import { planActions } from './aie/actionPlanner'
import { extractDateFromUtterance } from './actionAgent/dates'
import { wantsLocalAlarm } from './notify'
import { detectEverydayIntent, looksLikeSttGarbage } from './spokenCommand'
import { canUseGeolocation } from './location'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  geolocation: {
    getCurrentPosition: (_ok: unknown, err: (e: GeolocationPositionError) => void) =>
      err?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
  },
})

describe('full feature audit', () => {
  beforeEach(() => {
    store.clear()
    clearInterpretMode()
    endTranslationSession()
  })

  it('weather / location compact forms', async () => {
    for (const q of [
      '내일 내가있는곳의 날씨를알려줘',
      '내일하루종일 날씨좀 알려줘 내가있는 위치',
    ]) {
      const r = await think(q)
      expect(r.text).toMatch(/날씨/)
      expect(r.text).not.toMatch(/시간을 함께|내장 DB/)
    }
  })

  it('FX / news / joke not stolen', async () => {
    expect((await think('환율 알려줘')).text).toMatch(/환율|USD|원/i)
    expect((await think('오늘 뉴스')).text).toMatch(/뉴스/)
    expect((await think('농담해줘')).text).not.toMatch(/음성을 잘 듣지/)
    expect(looksLikeSttGarbage('농담해줘')).toBe(false)
    expect(wantsLocalAlarm('환율 알려줘')).toBe(false)
  })

  it('calendar 오후 is single task', async () => {
    expect(planActions('내일 오후 3시 회의 일정 추가해줘').multiTask).toBe(false)
    const r = await think('내일 오후 3시 회의 일정 추가해줘')
    expect(r.text).toMatch(/일정|회의|추가|등록|저장/)
    expect(r.text).not.toMatch(/작업 계획|필요한 정보:\s*date/)
  })

  it('translation oneshot with trailing payload', () => {
    expect(routeCommand({ text: '일본어로 번역해 안녕하세요' }).intent).toBe('translation.oneshot')
    expect(routeCommand({ text: '일본어로 번역해줘' }).intent).toBe('translation.session.start')
  })

  it('howto does not open travel slots', async () => {
    for (const q of ['비행기 예약하는 방법', '항공권은 어떻게 사나요', '제주도 여행 팁 알려줘']) {
      const routed = routeCommand({ text: q })
      expect(routed.reason, q).toBe('howto_or_explanation')
      expect(routed.intent, q).toBe('general.chat')
      const r = await think(q)
      expect(r.text, q).not.toMatch(/출발 날짜|정보 수집 중|목적지로 반영/)
      // Howto content, lifestyle tip list, or booking steps — never blank ack-only
      expect(r.text.length, q).toBeGreaterThan(40)
      expect(r.text, q).toMatch(/방법|팁|비교|사이트|예약|후보|제주|항공|네이버|스카이/i)
    }
  })

  it('relative travel dates parse', () => {
    const fri = extractDateFromUtterance('다음주 금', new Date('2026-08-07T12:00:00+09:00'))
    expect(fri?.resolvedDate).toBeTruthy()
    const mon = extractDateFromUtterance('다다음주 월', new Date('2026-08-07T12:00:00+09:00'))
    expect(mon?.resolvedDate).toBeTruthy()
    expect(mon!.resolvedDate > fri!.resolvedDate).toBe(true)
  })

  it('device location missing API is safe', () => {
    vi.stubGlobal('navigator', { onLine: true, geolocation: undefined })
    expect(canUseGeolocation()).toBe(false)
    expect(detectEverydayIntent('내 위치')?.kind).toBe('location')
  })

  it('youtube calm music is play, not DNA', async () => {
    const r = await think('유튜브에서 잔잔한 음악')
    expect(r.text).not.toMatch(/명시적 선호를 찾지/)
    expect(r.text).toMatch(/음악|재생|유튜브|노래|플레이/i)
  })

  it('restaurant DEMO list then ordinal select', async () => {
    const list = await think('나트랑 맛집좀 찾아줘')
    expect(list.text).toMatch(/DEMO|맛집|★/)
    const pick = await think('두 번째')
    expect(pick.text).not.toMatch(/어느 지역에서/)
    expect(pick.text).toMatch(/선택|상세|2번/)
  })
})
