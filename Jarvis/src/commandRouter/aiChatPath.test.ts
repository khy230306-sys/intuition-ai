/**
 * When Hybrid AI providers are configured, general.chat must use AI — not local templates.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetActionAgentForTests } from '../actionAgent'
import { endTranslationSession } from './session'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('navigator', { onLine: true, language: 'ko-KR' })

vi.mock('../ai-providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ai-providers')>()
  return {
    ...actual,
    hasAnyConfiguredProvider: () => true,
    runHybridChat: vi.fn(async ({ message }: { message: string }) => ({
      text: `【AI답변】${message}`,
      provider: 'openai' as const,
      model: 'test',
      latencyMs: 1,
    })),
  }
})

import { tryHandleRoutedCommand } from './execute'
import { runHybridChat } from '../ai-providers'

describe('general.chat AI path when providers configured', () => {
  beforeEach(() => {
    store.clear()
    resetActionAgentForTests()
    endTranslationSession()
    vi.mocked(runHybridChat).mockClear()
  })

  it('routes advice to hybrid AI', async () => {
    const r = await tryHandleRoutedCommand('스트레스 받을 때 어떻게 해?', {
      history: [{ role: 'user', text: '안녕' }],
    })
    expect(r?.text).toMatch(/【AI답변】/)
    expect(runHybridChat).toHaveBeenCalled()
  })

  it('routes howto to hybrid AI', async () => {
    const r = await tryHandleRoutedCommand('김치찌개 만드는 법 알려줘')
    expect(r?.text).toMatch(/【AI답변】김치찌개/)
  })

  it('routes open chat to hybrid AI', async () => {
    const r = await tryHandleRoutedCommand('오늘 뭐하면 좋을까?')
    expect(r?.text).toMatch(/【AI답변】/)
  })
})
