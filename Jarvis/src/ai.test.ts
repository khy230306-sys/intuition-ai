import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

vi.stubGlobal('crypto', {
  randomUUID: () => `id-${store.size}-${Math.random().toString(16).slice(2)}`,
})

describe('jarvis brain', () => {
  beforeEach(() => {
    store.clear()
  })

  it('answers time questions', async () => {
    const { think } = await import('./brain')
    const reply = await think('지금 몇 시야')
    expect(reply.text).toMatch(/지금은/)
  })

  it('calculates expressions', async () => {
    const { think } = await import('./brain')
    const reply = await think('계산 12*5')
    expect(reply.text).toContain('60')
  })

  it('stores and recalls memory', async () => {
    const { think } = await import('./brain')
    await think('기억해 테스트키는 테스트값')
    const reply = await think('테스트키 뭐였지')
    expect(reply.text).toContain('테스트값')
  })

  it('creates reminders', async () => {
    const { think } = await import('./brain')
    const reply = await think('할 일 우유 사기')
    expect(reply.text).toContain('우유 사기')
  })

  it('returns help text', async () => {
    const { think } = await import('./brain')
    const reply = await think('도움말')
    expect(reply.text).toContain('JARVIS')
  })
})
