import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeCommand } from '../commandRouter'
import { endTranslationSession } from '../commandRouter/session'
import { handleTravelAgent } from '../travelAgent'
import { detectTravelIntent, isTravelUtterance } from '../travelAgent/detect'
import { clearTravelSession } from '../travelAgent/session'

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

describe('how-to vs booking (final QA)', () => {
  beforeEach(() => {
    store.clear()
    clearTravelSession()
    endTranslationSession()
  })

  it('detect treats how-to as non-travel', () => {
    const t = '비행기 예약하는 방법 알려줘'
    expect(isTravelUtterance(t)).toBe(false)
    expect(detectTravelIntent(t, false)).toBeNull()
  })

  it('routes 비행기 예약하는 방법 away from travel.booking', () => {
    const r = routeCommand({ text: '비행기 예약하는 방법 알려줘' })
    expect(r.intent).toBe('general.chat')
    expect(r.reason).toBe('howto_or_explanation')
  })

  it('travel agent does not start booking Q&A for how-to', async () => {
    const out = await handleTravelAgent('비행기 예약하는 방법 알려줘')
    expect(out).toBeNull()
  })

  it('reminder parser ignores how-to 알려줘', async () => {
    const { parseReminderUtterance } = await import('../smartReminder/parse')
    expect(parseReminderUtterance('비행기 예약하는 방법 알려줘')).toBeNull()
  })

  it('local alarm does not steal how-to 알려줘', async () => {
    const { wantsLocalAlarm } = await import('../notify')
    expect(wantsLocalAlarm('비행기 예약하는 방법 알려줘')).toBe(false)
    expect(wantsLocalAlarm('알림 30분 뒤 약')).toBe(true)
  })
})
