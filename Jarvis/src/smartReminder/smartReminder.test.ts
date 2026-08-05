import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleRelationshipText } from '../relationship'
import {
  handleSmartReminderText,
  parseReminderUtterance,
  parseScheduleDateTime,
  listActiveReminders,
} from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })

describe('AIZIO Smart Reminder', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: async () => 'granted',
    })
  })

  it('parses mother hospital appointment', () => {
    const p = parseReminderUtterance('오늘 오후 2시에 엄마 병원 진찰 예약 있어.')
    expect(p?.kind).toBe('create')
    expect(p?.personDisplay).toBe('엄마')
    expect(p?.title).toMatch(/엄마|병원|진찰|예약/)
  })

  it('does not treat definition questions or pasted clocks as reminders', () => {
    expect(parseReminderUtterance('Ra ahn 아 무슨뜻이야?')).toBeNull()
    expect(parseReminderUtterance('성 성규 13:28 Ra ahn 아 무슨뜻이야?')).toBeNull()
    expect(parseReminderUtterance('서울이 뭐야?')).toBeNull()
  })

  it('does not invent future for past times', () => {
    const now = new Date()
    now.setHours(16, 0, 0, 0)
    const dt = parseScheduleDateTime('오늘 오후 2시에 병원 예약', now.getTime())
    expect(dt?.past).toBe(true)
  })

  it('creates reminder linked to relationship', async () => {
    handleRelationshipText('우리 엄마 이름은 김영희야.')
    const reply = await handleSmartReminderText('2시간 뒤에 엄마 병원 진찰 예약 알려줘.')
    expect(reply?.handled).toBe(true)
    expect(reply?.text).toMatch(/저장|알려/)
    expect(reply?.text).not.toMatch(/음성을|듣지 못/)
    expect(listActiveReminders().length).toBeGreaterThan(0)
  })

  it('follow-up advance alert and cancel', async () => {
    await handleSmartReminderText('3시간 뒤에 엄마 병원 예약 알려줘.')
    const adv = await handleSmartReminderText('30분 전에도 알려줘.')
    expect(adv?.text).toMatch(/30분 전|사전|추가/)
    const cancel = await handleSmartReminderText('취소해줘')
    expect(cancel?.text).toMatch(/취소/)
  })

  it('asks person schedule', async () => {
    await handleSmartReminderText('2시간 뒤에 엄마 병원 예약 알려줘.')
    const ask = await handleSmartReminderText('엄마 오늘 일정 뭐야?')
    expect(ask?.text).toMatch(/엄마|병원|일정/)
  })

  it('think() routes relationship and reminder', async () => {
    const { think } = await import('../brain')
    const r1 = await think('우리 엄마 이름은 김영희야.')
    expect(r1.text).toMatch(/김영희|엄마|어머니/)
    const r2 = await think('2시간 뒤에 엄마 병원 진찰 예약 알려줘.')
    expect(r2.text).toMatch(/저장|알려/)
    expect(r2.text).not.toMatch(/음성을|연결되지 않아/)
  })
})
