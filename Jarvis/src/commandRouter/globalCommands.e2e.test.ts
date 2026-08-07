/**
 * Global Command Layer E2E — must beat Active Travel Task / Flight Provider.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { think } from '../brain'
import { getActiveTask, getSuspendedTasks, resetActionAgentForTests } from '../actionAgent'
import { setActionAgentAllowFixtures } from './execute'
import { endTranslationSession } from './session'
import { clearTravelSession } from '../travelAgent/session'
import { detectGlobalCommand } from './globalCommands'
import { createTaskSession, saveTask } from '../actionAgent/sessionStore'

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

function seedNeedsProviderTravel() {
  const task = createTaskSession('travel.flight', '호치민 여행 준비', {
    origin: '부산',
    destination: '호치민',
    departureDate: { originalText: '8월10일', resolvedDate: '2026-08-10' },
    returnDate: { originalText: '8월14일', resolvedDate: '2026-08-14' },
    tripType: 'round_trip',
    passengers: 1,
  })
  return saveTask({
    ...task,
    status: 'needs_provider',
    pendingQuestion: null,
    expectedSlot: null,
    missingSlots: [],
  })
}

describe('Global Command Layer E2E', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    clearTravelSession()
    endTranslationSession()
    setActionAgentAllowFixtures(false)
  })

  it('detects spacing variants', () => {
    expect(detectGlobalCommand('대화초기화시켜줘')?.command).toBe('RESET_CONVERSATION')
    expect(detectGlobalCommand('대화 초기화 시켜줘')?.command).toBe('RESET_CONVERSATION')
    expect(detectGlobalCommand('대화창을 지워줘')?.command).toBe('CLEAR_CHAT')
    expect(detectGlobalCommand('대화창 초기화')?.command).toBe('CLEAR_CHAT')
    expect(detectGlobalCommand('대화창초기화')?.command).toBe('CLEAR_CHAT')
    expect(detectGlobalCommand('채팅창 초기화해줘')?.command).toBe('CLEAR_CHAT')
    expect(detectGlobalCommand('채팅창 비워줘')?.command).toBe('CLEAR_CHAT')
    expect(detectGlobalCommand('여행 취소')?.command).toBe('CANCEL_ACTIVE_TASK')
    expect(detectGlobalCommand('처음부터 다시')?.command).toBe('RESET_CONVERSATION')
    expect(detectGlobalCommand('새 대화 시작')?.command).toBe('NEW_CONVERSATION')
  })

  it('CASE A: 대화초기화시켜줘 clears task — no provider message', async () => {
    seedNeedsProviderTravel()
    expect(getActiveTask()?.status).toBe('needs_provider')

    const r = await think('대화초기화시켜줘')
    expect(r.clearChat).toBe(true)
    expect(r.text).toMatch(/초기화/)
    expect(r.text).not.toMatch(/항공 검색에 필요한|제공자가 연결되지/)
    expect(getActiveTask()).toBeNull()
    expect(getSuspendedTasks()).toHaveLength(0)
  })

  it('CASE B: 대화창을 지워줘 — no Travel/Provider response', async () => {
    seedNeedsProviderTravel()
    const r = await think('대화창을 지워줘')
    expect(r.clearChat).toBe(true)
    expect(r.text).not.toMatch(/항공 검색|제공자|호치민 여행/)
    expect(getActiveTask()).toBeNull()
  })

  it('CASE B2: 대화창초기화 clears persisted chat storage', async () => {
    const { saveChat, loadChat } = await import('../storage')
    saveChat([
      { id: '1', role: 'user', text: '안녕', createdAt: 1 },
      { id: '2', role: 'assistant', text: '네', createdAt: 2 },
    ])
    expect(loadChat().length).toBe(2)
    const r = await think('대화창초기화')
    expect(r.clearChat).toBe(true)
    expect(loadChat()).toEqual([])
  })

  it('CASE C: 여행 취소 keeps chat flag false; later 안녕 is general', async () => {
    seedNeedsProviderTravel()
    const r = await think('여행 취소')
    expect(r.clearChat).toBeFalsy()
    expect(r.text).toMatch(/여행 준비를 취소/)
    expect(getActiveTask()).toBeNull()

    const hi = await think('안녕')
    expect(hi.text).not.toMatch(/항공 검색에 필요한|제공자가 연결되지|호치민 여행 준비/)
  })

  it('CASE D: weather during travel suspends but does not reset', async () => {
    setActionAgentAllowFixtures(true)
    await think('비행기표 알아봐줘')
    await think('8월10일 부산에서 호치민')
    expect(getActiveTask()?.type.startsWith('travel')).toBe(true)

    const w = await think('오늘 날씨 알려줘')
    expect(w.text.length).toBeGreaterThan(0)
    expect(w.text).not.toMatch(/대화를 초기화/)
    // Task preserved in suspended or active
    const still =
      getActiveTask()?.type.startsWith('travel') ||
      getSuspendedTasks().some((t) => t.type.startsWith('travel'))
    expect(still).toBe(true)
  })

  it('needs_provider does not monopolize 안녕', async () => {
    seedNeedsProviderTravel()
    const r = await think('안녕')
    expect(r.text).not.toMatch(/항공 검색에 필요한 정보는 모았어요/)
    // Task may still exist, but must not force provider reply
    expect(getActiveTask()?.status).toBe('needs_provider')
  })

  it('Travel date regression after global layer', async () => {
    setActionAgentAllowFixtures(true)
    await think('비행기표 알아봐줘')
    await think('8월10일 부산에서 호치민')
    await think('왕복')
    await think('8월14일')
    const t = getActiveTask()!
    expect(t.slots.origin).toBe('부산')
    expect(t.slots.destination).toBe('호치민')
    expect(t.slots.departureDate?.resolvedDate).toMatch(/-08-10$/)
    expect(t.slots.returnDate?.resolvedDate).toMatch(/-08-14$/)
    expect(t.slots.tripType).toBe('round_trip')
    expect(t.slots.departureDate?.resolvedDate).not.toBe(t.slots.returnDate?.resolvedDate)
  })
})
