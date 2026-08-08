import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  buildAlarmFromText,
  formatAlarmSetReply,
  parseWhenFromText,
  wantsLocalAlarm,
} from './notify'

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

describe('alarm set · 오전 5시에 알람을 맞춰줘', () => {
  beforeEach(() => store.clear())

  const now = new Date('2026-08-09T03:44:00+09:00').getTime()

  it('detects set-alarm phrasing', () => {
    expect(wantsLocalAlarm('오전 5시에 알람을 맞춰줘')).toBe(true)
    expect(wantsLocalAlarm('내일 아침 7시 알람 맞춰줘')).toBe(true)
    expect(wantsLocalAlarm('5시에 깨워줘')).toBe(true)
  })

  it('parses 05:00 and cleans body to 기상 알람', () => {
    const p = parseWhenFromText('오전 5시에 알람을 맞춰줘', now)
    expect(p).not.toBeNull()
    expect(new Date(p!.whenAt).getHours()).toBe(5)
    expect(new Date(p!.whenAt).getMinutes()).toBe(0)

    const b = buildAlarmFromText('오전 5시에 알람을 맞춰줘', now)
    expect(b).not.toBeNull()
    expect(b!.alarm.body).toBe('기상 알람')
    expect(formatAlarmSetReply(b!.alarm.body, b!.whenLabel, b!.alarm.whenAt)).toMatch(/알람을 맞춰 두었어요/)
  })
})

describe('think() sets alarm without Hybrid refusal', () => {
  beforeEach(() => store.clear())

  it('오전 5시에 알람을 맞춰줘 → confirms set, no PWA refusal', async () => {
    const { think } = await import('./brain')
    const r = await think('오전 5시에 알람을 맞춰줘')
    expect(r.text).toMatch(/알람을 맞춰 두었어요/)
    expect(r.text).not.toMatch(/PWA|시계 앱|직접 켜드릴 수는/)
  })
})
