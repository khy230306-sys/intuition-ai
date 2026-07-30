import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelAlarm, loadAlarms, scheduleAlarm, setAlarmUiHandler } from './notify'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', {
  randomUUID: () => `alarm-${store.size}-${Math.random().toString(16).slice(2)}`,
})

describe('local alarms', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    store.clear()
    setAlarmUiHandler(null)
  })
  afterEach(() => {
    vi.useRealTimers()
    setAlarmUiHandler(null)
    store.clear()
  })

  it('does not fire early when whenAt is beyond 24 hours', () => {
    const fired: string[] = []
    setAlarmUiHandler((a) => fired.push(a.id))

    const whenAt = Date.now() + 3 * 24 * 60 * 60_000 // 3 days
    const alarm = scheduleAlarm('테스트', '본문', whenAt)
    expect(loadAlarms()[0].fired).toBe(false)

    // Old bug: clamped to 24h and fired early
    vi.advanceTimersByTime(24 * 60 * 60_000 + 5_000)
    expect(fired).toHaveLength(0)
    expect(loadAlarms().find((a) => a.id === alarm.id)?.fired).toBe(false)

    vi.advanceTimersByTime(2 * 24 * 60 * 60_000)
    expect(fired).toContain(alarm.id)
    expect(loadAlarms().find((a) => a.id === alarm.id)?.fired).toBe(true)
  })

  it('fires immediately when whenAt is in the past', () => {
    const fired: string[] = []
    setAlarmUiHandler((a) => fired.push(a.id))
    const alarm = scheduleAlarm('과거', '지금', Date.now() - 1000)
    expect(fired).toContain(alarm.id)
  })

  it('cancelAlarm stops pending fire', () => {
    const fired: string[] = []
    setAlarmUiHandler((a) => fired.push(a.id))
    const alarm = scheduleAlarm('취소', 'x', Date.now() + 60_000)
    expect(cancelAlarm(alarm.id)).toBe(true)
    vi.advanceTimersByTime(120_000)
    expect(fired).not.toContain(alarm.id)
  })
})
