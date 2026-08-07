/**
 * Device regression: stale Travel Task + semantic date roles.
 * CASE 1–4 from real-device failure logs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { setActionAgentAllowFixtures } from '../commandRouter/execute'
import { endTranslationSession } from '../commandRouter/session'
import { clearTravelSession } from '../travelAgent/session'
import { extractSemanticDates } from './semanticDateExtractor'
import { getActiveTask, resetActionAgentForTests } from './index'
import { createTaskSession, saveTask } from './sessionStore'
import { renderActiveTaskCard } from './ui/taskCard'

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
vi.stubGlobal('navigator', {
  onLine: true,
  language: 'ko-KR',
  geolocation: { getCurrentPosition: () => {} },
})

function seedStaleReturnPending() {
  const task = createTaskSession('travel.flight', '호치민 여행 준비', {
    origin: '부산',
    destination: '호치민',
    departureDate: { originalText: '8월14일', resolvedDate: '2026-08-14' },
    tripType: 'round_trip',
  })
  return saveTask({
    ...task,
    pendingQuestion: 'returnDate',
    expectedSlot: 'returnDate',
    questionId: 'q_stale_return',
    status: 'collecting',
  })
}

describe('Stale Travel Task + semantic dates (device regression)', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    clearTravelSession()
    endTranslationSession()
    setActionAgentAllowFixtures(true)
  })

  it('CASE 1: rich utterance updates departure — does NOT treat as returnDate', async () => {
    seedStaleReturnPending()
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toBe('2026-08-14')
    expect(getActiveTask()?.expectedSlot).toBe('returnDate')

    const r = await think('8월10 호치민으로 여행갈꺼야 비행기표를 알아봐줘')
    expect(r.text).not.toMatch(/돌아오는 날짜가 출발일보다 빠릅니다/)
    const t = getActiveTask()!
    expect(t.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t.slots.destination).toBe('호치민')
    // Must not keep stale 8/14 as departure
    expect(t.slots.departureDate?.resolvedDate).not.toBe('2026-08-14')
  })

  it('CASE 2: 돌아오는날짜는 8월14일이야 — only returnDate changes', async () => {
    const task = createTaskSession('travel.flight', '호치민 여행 준비', {
      origin: '부산',
      destination: '호치민',
      departureDate: { originalText: '8월10일', resolvedDate: '2026-08-10' },
      tripType: 'round_trip',
    })
    saveTask({
      ...task,
      pendingQuestion: 'returnDate',
      expectedSlot: 'returnDate',
      status: 'collecting',
    })

    const r = await think('돌아오는날짜는 8월14일이야')
    expect(r.text).not.toMatch(/출발일보다 빠릅니다/)
    const t = getActiveTask()!
    expect(t.slots.departureDate?.resolvedDate).toBe('2026-08-10')
    expect(t.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    // Never clone return onto departure
    expect(t.slots.departureDate?.resolvedDate).not.toBe(t.slots.returnDate?.resolvedDate)
  })

  it('CASE 3: 8월10일출발 8월14일 돌아올꺼야 호치민', async () => {
    const task = createTaskSession('travel.flight', '여행', {
      origin: '부산',
    })
    saveTask({ ...task, status: 'collecting', expectedSlot: 'departureDate', pendingQuestion: 'departureDate' })

    await think('8월10일출발 8월14일 돌아올꺼야 호치민')
    const t = getActiveTask()!
    expect(t.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(t.slots.destination).toBe('호치민')
    expect(t.slots.origin).toBe('부산')
    const card = renderActiveTaskCard(t)
    expect(card).toMatch(/출발:.*08-10/)
    expect(card).toMatch(/귀국:.*08-14/)
  })

  it('CASE 4: one-shot full slots — no re-ask of filled fields', async () => {
    await think('비행기표 알아봐줘')
    const r = await think('8월10일 부산에서 호치민 출발해서 8월14일 돌아올꺼야 왕복 2명')
    const t = getActiveTask()!
    expect(t.slots.origin).toBe('부산')
    expect(t.slots.destination).toBe('호치민')
    expect(t.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(t.slots.tripType).toBe('round_trip')
    expect(t.slots.passengers).toBe(2)
    // Must not re-ask date/dest/origin/trip/return
    expect(r.text).not.toMatch(/여행 날짜가 언제|어디로 가시나요|출발지는 어디|편도인가요|돌아오는 날짜는 언제/)
  })

  it('CASE 5: natural dialog flow', async () => {
    await think('비행기표 알아봐줘')
    await think('8월10일 부산에서 호치민 갈거야')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(getActiveTask()?.slots.origin).toBe('부산')
    expect(getActiveTask()?.slots.destination).toBe('호치민')

    const rTrip = await think('왕복')
    expect(rTrip.text).toMatch(/돌아오는 날짜/)
    expect(getActiveTask()?.slots.tripType).toBe('round_trip')

    const rRet = await think('8월14일')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(getActiveTask()?.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(rRet.text).not.toMatch(/돌아오는 날짜는 언제인가요/)
  })

  it('CASE: 호치민행 → 내일 → 부산 → 편도 → 혼자 (no re-ask destination, DEMO results)', async () => {
    const r1 = await think('호치민행 비행기표를 검색해줘')
    expect(getActiveTask()?.slots.destination).toBe('호치민')
    expect(r1.text).not.toMatch(/어디로 가시나요/)

    await think('내일')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toBeTruthy()
    expect(getActiveTask()?.slots.destination).toBe('호치민')

    await think('부산에서 출발')
    expect(getActiveTask()?.slots.origin).toBe('부산')

    await think('편도')
    const r = await think('혼자')
    expect(getActiveTask()?.slots.passengers).toBe(1)
    expect(r.text).toMatch(/DEMO|항공|대한|아시아나/)
    expect(getActiveTask()?.status).not.toBe('needs_provider')
    expect(getActiveTask()?.results?.length).toBeGreaterThan(0)
  })

  it('semantic extractor unit: device phrases', () => {
    const a = extractSemanticDates('8월10 호치민으로 여행갈꺼야 비행기표를 알아봐줘')
    expect(a.some((d) => d.role === 'departureDate' && d.value.endsWith('-08-10'))).toBe(true)
    expect(a.every((d) => d.role !== 'returnDate')).toBe(true)

    const b = extractSemanticDates('돌아오는날짜는 8월14일이야')
    expect(b.some((d) => d.role === 'returnDate' && d.value.endsWith('-08-14'))).toBe(true)
    expect(b.every((d) => d.role !== 'departureDate')).toBe(true)

    const c = extractSemanticDates('8월10일출발 8월14일 돌아올꺼야')
    expect(c.find((d) => d.role === 'departureDate')?.value).toMatch(/-08-10$/)
    expect(c.find((d) => d.role === 'returnDate')?.value).toMatch(/-08-14$/)
  })
})
