/**
 * Device-repro Multi-turn Context E2E — full think() pipeline.
 * Proves Active Task + Pending Question beat city.info / standalone intents.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { setActionAgentAllowFixtures } from '../commandRouter/execute'
import { endTranslationSession } from '../commandRouter/session'
import { clearTravelSession } from '../travelAgent/session'
import { getActiveTask, getSuspendedTasks, resetActionAgentForTests } from './index'
import { extractMultiSlots } from './multiSlotExtractor'

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

describe('Multi-turn Context E2E (device repro via think)', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    clearTravelSession()
    endTranslationSession()
    setActionAgentAllowFixtures(true)
  })

  it('TEST 1: 여행 준비 → 8월10 호치민 → 비행기표 (no city.info, no re-ask date)', async () => {
    const r1 = await think('여행 준비 도와줘')
    expect(r1.text).toMatch(/여행 날짜|날짜가 언제|출발 날짜|목적지를 알려/)
    expect(r1.text).not.toMatch(/【도시 정보】/)
    const task1 = getActiveTask()
    expect(task1).toBeTruthy()
    expect(task1!.type.startsWith('travel')).toBe(true)
    expect(task1!.pendingQuestion).toBe('departureDate')

    const r2 = await think('8월10 호치민으로갈꺼야')
    expect(r2.text).not.toMatch(/【도시 정보】/)
    expect(r2.text).not.toMatch(/도시 정보/)
    const task2 = getActiveTask()
    expect(task2).toBeTruthy()
    expect(task2!.type.startsWith('travel')).toBe(true)
    expect(task2!.slots.destination).toBe('호치민')
    expect(task2!.slots.departureDate?.originalText).toMatch(/8월\s*10/)
    expect(task2!.slots.departureDate?.resolvedDate).toMatch(/^\d{4}-08-10$/)
    // Should ask next missing (origin / trip type / …) — NOT re-ask the date as if empty
    expect(r2.text).not.toMatch(/좋아요\. 여행 날짜가 언제인가요\?/)

    const r3 = await think('비행기표좀알아봐줘')
    expect(r3.text).not.toMatch(/【도시 정보】/)
    expect(r3.text).not.toMatch(/좋아요\. 여행 날짜가 언제인가요\?/)
    const task3 = getActiveTask()
    expect(task3!.slots.destination).toBe('호치민')
    expect(task3!.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    // Still same session — date preserved while collecting other slots or searching
    expect(task3!.id).toBe(task2!.id)
  })

  it('TEST 2: multi-slot one-shot keeps all five fields', async () => {
    await think('여행 준비 도와줘')
    const r = await think('8월10일부터 13일까지 인천에서 호치민 2명')
    expect(r.text).not.toMatch(/【도시 정보】/)
    const task = getActiveTask()!
    expect(task.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(task.slots.returnDate?.resolvedDate).toMatch(/-08-13$/)
    expect(task.slots.origin).toBe('인천')
    expect(task.slots.destination).toBe('호치민')
    expect(task.slots.passengers).toBe(2)

    const r2 = await think('비행기 알아봐줘')
    expect(r2.text).not.toMatch(/좋아요\. 여행 날짜가 언제인가요\?/)
    const t2 = getActiveTask()!
    expect(t2.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t2.slots.returnDate?.resolvedDate).toMatch(/-08-13$/)
    expect(t2.slots.origin).toBe('인천')
    expect(t2.slots.destination).toBe('호치민')
    expect(t2.slots.passengers).toBe(2)
  })

  it('TEST 3: short pending answers stay on travel slots', async () => {
    await think('여행 준비 도와줘')
    expect(getActiveTask()?.pendingQuestion).toBe('departureDate')

    await think('8월10일')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(getActiveTask()?.pendingQuestion).toBe('destination')

    const rDest = await think('호치민')
    expect(rDest.text).not.toMatch(/【도시 정보】/)
    expect(getActiveTask()?.slots.destination).toBe('호치민')
    expect(getActiveTask()?.pendingQuestion).toBe('origin')

    await think('인천')
    expect(getActiveTask()?.slots.origin).toBe('인천')

    // trip type may be asked before passengers
    const pending = getActiveTask()?.pendingQuestion
    if (pending === 'tripType') {
      await think('편도')
    }
    if (getActiveTask()?.pendingQuestion === 'returnDate') {
      await think('8월13일')
    }
    if (getActiveTask()?.pendingQuestion === 'passengers') {
      const rPax = await think('2명')
      expect(rPax.text).not.toMatch(/【도시 정보】/)
      expect(getActiveTask()?.slots.passengers).toBe(2)
    } else {
      await think('2명')
      expect(getActiveTask()?.slots.passengers).toBe(2)
    }
    expect(getActiveTask()?.slots.destination).toBe('호치민')
    expect(getActiveTask()?.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
  })

  it('TEST 4: explicit weather then 여행 계속 restores travel', async () => {
    await think('여행 준비 도와줘')
    await think('8월10 호치민으로갈꺼야')
    const before = getActiveTask()!
    expect(before.slots.destination).toBe('호치민')

    const weather = await think('호치민 날씨 알려줘')
    // Weather path should answer (or attempt) — must not wipe slots permanently
    expect(weather.text.length).toBeGreaterThan(0)
    expect(getSuspendedTasks().some((t) => t.type.startsWith('travel'))).toBe(true)

    const resumed = await think('여행 계속')
    expect(resumed.text).not.toMatch(/【도시 정보】/)
    const task = getActiveTask()!
    expect(task.type.startsWith('travel')).toBe(true)
    expect(task.slots.destination).toBe('호치민')
    expect(task.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
  })

  it('TEST 5: explicit city.info keeps travel task', async () => {
    await think('여행 준비 도와줘')
    await think('8월10 호치민으로갈꺼야')
    const id = getActiveTask()!.id

    const city = await think('호치민에 대해 알려줘')
    expect(city.text).toMatch(/호치민|도시/)
    // Travel task must still exist (active or at least not cancelled)
    const still = getActiveTask()
    expect(still?.id === id || getSuspendedTasks().some((t) => t.id === id)).toBe(true)
    if (still) {
      expect(still.slots.destination).toBe('호치민')
      expect(still.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    }
  })

  it('multi-slot extractor unit: combined utterances', () => {
    const a = extractMultiSlots('8월10 호치민으로갈꺼야')
    expect(a.destination).toBe('호치민')
    expect(a.departureDate?.resolvedDate).toMatch(/-08-10$/)

    const b = extractMultiSlots('8월10일부터 13일까지 인천에서 호치민 2명')
    expect(b.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(b.returnDate?.resolvedDate).toMatch(/-08-13$/)
    expect(b.origin).toBe('인천')
    expect(b.destination).toBe('호치민')
    expect(b.passengers).toBe(2)

    const c = extractMultiSlots('8월10일 인천에서 호치민 갈거야')
    expect(c.origin).toBe('인천')
    expect(c.destination).toBe('호치민')
    expect(c.departureDate?.resolvedDate).toMatch(/-08-10$/)
  })

  it('호치민행 + 호치민이라고 particle stripping', () => {
    const a = extractMultiSlots('호치민행 비행기표를 검색해줘')
    expect(a.destination).toBe('호치민')

    const b = extractMultiSlots('호치민이라고', { pendingQuestion: 'destination' })
    expect(b.destination).toBe('호치민')

    const c = extractMultiSlots('내일', { pendingQuestion: 'departureDate' })
    expect(c.departureDate?.resolvedDate).toBeTruthy()
  })
})
