import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeCommand } from '../commandRouter'
import { setActionAgentAllowFixtures, tryHandleRoutedCommand } from '../commandRouter/execute'
import {
  startTranslationSession,
  endTranslationSession,
} from '../commandRouter/session'
import { extractDateFromUtterance, resolveKoreanDate } from './dates'
import { processActionAgentTurn, resetActionAgentForTests } from './pipeline'
import { getActiveTask, getSuspendedTasks } from './sessionStore'
import { classifyTodoShopping } from '../life/todoShopping'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v)
  },
  removeItem: (k: string) => {
    store.delete(k)
  },
  clear: () => store.clear(),
})

async function turn(text: string) {
  const routed = routeCommand({ text })
  return processActionAgentTurn(text, routed, { allowFixtures: true })
}

describe('Action Agent V1', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    endTranslationSession()
    setActionAgentAllowFixtures(true)
  })

  it('A: flight multi-turn collects slots then searches', async () => {
    let r = await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    expect(r.handled).toBe(true)
    expect(r.replyText).toMatch(/출발/)
    expect(getActiveTask()?.slots.destination).toBe('제주')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    r = await turn('김포')
    expect(r.replyText).toMatch(/편도|왕복/)

    r = await turn('왕복')
    expect(r.replyText).toMatch(/돌아오|날짜/)

    // Return must be after departure (bare 「일요일」 can resolve to a date before next Friday)
    r = await turn('다음 주 일요일')
    expect(r.replyText).toMatch(/명|분/)
    expect(getActiveTask()?.slots.returnDate?.resolvedDate).toBeTruthy()
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toBeTruthy()
    expect(getActiveTask()!.slots.returnDate!.resolvedDate >= getActiveTask()!.slots.departureDate!.resolvedDate).toBe(
      true,
    )

    r = await turn('2명')
    expect(r.replyText).toMatch(/result|후보|테스트용|1\./i)
    expect(getActiveTask()?.results.length).toBeGreaterThanOrEqual(2)
  })

  it('B: hotel inherits travel context', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('김포')
    await turn('편도')
    await turn('2명')
    const r = await turn('호텔도 찾아줘')
    expect(r.handled).toBe(true)
    expect(getActiveTask()?.type).toBe('travel.hotel')
    expect(getActiveTask()?.slots.destination).toBe('제주')
    expect(r.replyText).toMatch(/호텔|제공자|후보|체크/)
  })

  it('C: selection by 두 번째', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('김포')
    await turn('편도')
    await turn('2명')
    const r = await turn('두 번째')
    expect(r.replyText).toMatch(/2번|선택/)
    expect(getActiveTask()?.slots.selectedResultId).toBe('result_2')
  })

  it('D: calendar action from selection', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('김포')
    await turn('편도')
    await turn('2명')
    await turn('두 번째')
    const r = await turn('일정에 넣어줘')
    expect(r.replyText).toMatch(/일정|저장|할 일/)
  })

  it('E: reminder from flight selection', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('김포')
    await turn('편도')
    await turn('2명')
    await turn('첫 번째')
    const r = await turn('출발 두 시간 전에 알려줘')
    expect(r.replyText).toMatch(/알림/)
  })

  it('F: weather interrupt preserves suspended travel', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    const r = await turn('오늘 날씨 어때?')
    expect(r.fallthrough).toBe(true)
    expect(getSuspendedTasks().some((t) => t.type === 'travel.flight')).toBe(true)
  })

  it('G: resume suspended travel', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('오늘 날씨 어때?')
    const r = await turn('아까 여행 계속')
    expect(r.handled).toBe(true)
    expect(getActiveTask()?.type).toBe('travel.flight')
    expect(r.replyText).toMatch(/출발|김포|정보/)
  })

  it('H: translation mode blocks travel task start', async () => {
    startTranslationSession('en', '영어')
    const routed = routeCommand({ text: '내일 제주도 가는 비행기 찾아줘' })
    const r = await processActionAgentTurn('내일 제주도 가는 비행기 찾아줘', routed, {
      allowFixtures: true,
    })
    expect(r.fallthrough).toBe(true)
    expect(getActiveTask()).toBeNull()
    endTranslationSession()
  })

  it('I: how-to does not create task session via router ownership', async () => {
    const routed = routeCommand({ text: '비행기 예약하는 방법 알려줘' })
    expect(routed.intent).toBe('general.chat')
    const r = await processActionAgentTurn('비행기 예약하는 방법 알려줘', routed, {
      allowFixtures: true,
    })
    expect(r.handled).toBe(false)
    expect(getActiveTask()).toBeNull()
  })

  it('J/K: todo vs shopping classifiers', () => {
    expect(classifyTodoShopping('할 일 장보기 추가').kind).toBe('todo.create')
    expect(classifyTodoShopping('장바구니에 우유 추가').kind).toBe('shopping.add')
  })

  it('L: slot change invalidates prior origin and refreshes search', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('김포')
    await turn('편도')
    await turn('2명')
    expect(getActiveTask()?.results.length).toBeGreaterThan(0)
    const before = getActiveTask()?.results[0]?.title
    await turn('부산에서')
    expect(getActiveTask()?.slots.origin).toBe('부산')
    // Prior Kimpo results must not be reused as-is after origin change
    const after = getActiveTask()?.results[0]?.title
    expect(getActiveTask()?.resultsStale || after !== before || /부산/.test(after || '')).toBeTruthy()
  })

  it('M: cancel then follow-up does not attach', async () => {
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    await turn('취소')
    expect(getActiveTask()).toBeNull()
    const r = await turn('김포')
    expect(r.handled).toBe(false)
  })

  it('date resolver keeps originalText + ISO', () => {
    const d = resolveKoreanDate('다음 주 금요일')
    expect(d?.originalText).toContain('금요일')
    expect(d?.resolvedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const e = extractDateFromUtterance('다음 주 금요일 제주도 가는 비행기 알아봐')
    expect(e?.resolvedDate).toBeTruthy()
  })

  it('production path reports NEEDS_PROVIDER without fixtures', async () => {
    setActionAgentAllowFixtures(false)
    await turn('다음 주 금요일 제주도 가는 비행기 알아봐')
    // force fixtures off for this search
    const routed = routeCommand({ text: '김포' })
    await processActionAgentTurn('김포', routed, { allowFixtures: false })
    await processActionAgentTurn('편도', routeCommand({ text: '편도' }), { allowFixtures: false })
    const r = await processActionAgentTurn('2명', routeCommand({ text: '2명' }), { allowFixtures: false })
    expect(r.replyText).toMatch(/제공자|연결되지|NEEDS_PROVIDER|검색 제공자/)
    expect(getActiveTask()?.status).toBe('needs_provider')
  })

  it('chat path tryHandleRoutedCommand uses Action Agent', async () => {
    const reply = await tryHandleRoutedCommand('다음 주 금요일 제주도 가는 비행기 알아봐')
    expect(reply?.text).toMatch(/출발|여행/)
  })
})
