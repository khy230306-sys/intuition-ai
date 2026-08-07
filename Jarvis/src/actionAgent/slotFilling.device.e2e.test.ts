/**
 * Device-repro E2E: returnDate must not overwrite departureDate;
 * 「완복」 → round_trip; full think() pipeline.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { setActionAgentAllowFixtures } from '../commandRouter/execute'
import { endTranslationSession } from '../commandRouter/session'
import { clearTravelSession } from '../travelAgent/session'
import { getActiveTask, getActionAgentDiag, resetActionAgentForTests } from './index'
import { normalizeTripType } from './tripTypeNormalize'
import { renderActiveTaskCard } from './ui/taskCard'
import { resolveExpectedSlot } from './expectedSlotResolver'
import { createTaskSession, saveTask } from './sessionStore'

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

async function logTurn(label: string, text: string) {
  const reply = await think(text)
  const task = getActiveTask()
  console.log(
    `[${label}] user=${text} | reply=${reply.text.split('\n')[0]} | slots=${JSON.stringify({
      dep: task?.slots.departureDate?.resolvedDate,
      ret: task?.slots.returnDate?.resolvedDate,
      origin: task?.slots.origin,
      dest: task?.slots.destination,
      trip: task?.slots.tripType,
      pax: task?.slots.passengers,
      expected: task?.expectedSlot,
    })}`,
  )
  return reply
}

describe('Device slot-filling E2E (returnDate + 완복)', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    clearTravelSession()
    endTranslationSession()
    setActionAgentAllowFixtures(true)
  })

  it('CASE A: full dialog — returnDate does not overwrite departureDate', async () => {
    await logTurn('1', '비행기표를알아봐줘')
    expect(getActiveTask()?.expectedSlot).toBe('departureDate')

    await logTurn('2', '8월10일이야')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)

    await logTurn('3', '호치민')
    expect(getActiveTask()?.slots.destination).toBe('호치민')

    await logTurn('4', '부산')
    expect(getActiveTask()?.slots.origin).toBe('부산')

    const rTrip = await logTurn('5', '왕복')
    expect(getActiveTask()?.slots.tripType).toBe('round_trip')
    expect(rTrip.text).toMatch(/돌아오는 날짜/)
    expect(getActiveTask()?.expectedSlot).toBe('returnDate')

    const rRet = await logTurn('6', '8월14일')
    const task = getActiveTask()!
    expect(task.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(task.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(task.slots.destination).toBe('호치민')
    expect(task.slots.origin).toBe('부산')
    expect(task.slots.tripType).toBe('round_trip')
    // Must NOT re-ask return date
    expect(rRet.text).not.toMatch(/돌아오는 날짜는 언제인가요/)
    // Task card shows both dates independently
    const card = renderActiveTaskCard(task)
    expect(card).toMatch(/출발:\s*2026-08-10|출발: 20\d\d-08-10/)
    expect(card).toMatch(/귀국:\s*20\d\d-08-14/)
    expect(card).toMatch(/왕복/)
  })

  it('CASE B: 완복 normalizes to round_trip without repeat', async () => {
    await think('비행기표를알아봐줘')
    await think('8월10일이야')
    await think('호치민')
    await think('부산')
    expect(getActiveTask()?.expectedSlot).toBe('tripType')

    const r = await think('완복')
    expect(normalizeTripType('완복').tripType).toBe('round_trip')
    expect(getActiveTask()?.slots.tripType).toBe('round_trip')
    expect(r.text).toMatch(/돌아오는 날짜/)
    expect(r.text).not.toMatch(/편도인가요, 왕복인가요/)
    // Second 완복 must not be needed
    expect(getActiveTask()?.expectedSlot).toBe('returnDate')
  })

  it('CASE C: expected returnDate keeps departureDate', async () => {
    const task = createTaskSession('travel.flight', '테스트', {
      departureDate: { originalText: '8월10일', resolvedDate: '2026-08-10' },
      destination: '호치민',
      origin: '부산',
      tripType: 'round_trip',
    })
    saveTask({
      ...task,
      pendingQuestion: 'returnDate',
      expectedSlot: 'returnDate',
      questionId: 'q_test_return',
      status: 'collecting',
    })
    const resolved = resolveExpectedSlot(getActiveTask()!, '8월14일')
    expect(resolved.ok).toBe(true)
    expect(resolved.proposals.some((p) => p.key === 'returnDate')).toBe(true)
    expect(resolved.proposals.some((p) => p.key === 'departureDate')).toBe(false)

    await think('8월14일')
    const after = getActiveTask()!
    expect(after.slots.departureDate?.resolvedDate).toBe('2026-08-10')
    expect(after.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
  })

  it('CASE D: return before departure — reject, keep departure', async () => {
    const task = createTaskSession('travel.flight', '테스트', {
      departureDate: { originalText: '8월10일', resolvedDate: '2026-08-10' },
      destination: '호치민',
      origin: '부산',
      tripType: 'round_trip',
    })
    saveTask({
      ...task,
      pendingQuestion: 'returnDate',
      expectedSlot: 'returnDate',
      status: 'collecting',
    })
    const r = await think('8월8일')
    expect(r.text).toMatch(/출발일보다 빠릅니다|다시 알려/)
    const after = getActiveTask()!
    expect(after.slots.departureDate?.resolvedDate).toBe('2026-08-10')
    expect(after.slots.returnDate).toBeFalsy()
    expect(after.expectedSlot).toBe('returnDate')
  })

  it('CASE E: one-shot multi-slot sentence', async () => {
    await think('비행기표를알아봐줘')
    await think('8월10일부터 14일까지 부산에서 호치민 왕복으로 2명')
    const t = getActiveTask()!
    expect(t.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(t.slots.origin).toBe('부산')
    expect(t.slots.destination).toBe('호치민')
    expect(t.slots.tripType).toBe('round_trip')
    expect(t.slots.passengers).toBe(2)
  })

  it('diag panel exposes expected slot + rejected overwrites', async () => {
    await think('비행기표를알아봐줘')
    await think('8월10일이야')
    await think('호치민')
    await think('부산')
    await think('왕복')
    await think('8월14일')
    const diag = getActionAgentDiag('travel.flight.search')
    expect(diag.expectedSlot === 'passengers' || diag.missingSlots.includes('passengers') || !diag.missingSlots.includes('returnDate')).toBe(true)
    expect(diag.lastTurn || diag.activeTask?.lastDiag).toBeTruthy()
  })
})
