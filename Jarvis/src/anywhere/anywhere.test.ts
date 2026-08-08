import { beforeEach, describe, expect, it, vi } from 'vitest'
import { needsNetworkFact, offlineNetworkRefusal } from './hallucinationGuard'
import { pickAiEngine } from './cloudLocalRouter'
import { loadPackStore, savePackStore, setPackState, isChatModelInstalled } from './packState'
import { recommendChatPack } from './modelRegistry'

const mem = new Map<string, string>()

describe('anywhere hallucination guard', () => {
  it('blocks weather / live prices offline', () => {
    expect(needsNetworkFact('내일 울산 날씨?')).toBe(true)
    expect(offlineNetworkRefusal('내일 날씨?')).toMatch(/오프라인|인터넷/)
    expect(needsNetworkFact('내 일정 보여줘')).toBe(false)
  })
})

describe('anywhere pack state', () => {
  beforeEach(() => {
    mem.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
      clear: () => mem.clear(),
    })
  })

  it('tracks chat model install', () => {
    expect(isChatModelInstalled()).toBe(false)
    const pack = recommendChatPack('LITE')
    setPackState({ id: pack.id, status: 'installed', progress: 100, installedAt: new Date().toISOString() })
    const s = loadPackStore()
    s.activeChatPackId = pack.id
    savePackStore(s)
    expect(isChatModelInstalled()).toBe(true)
  })
})

describe('anywhere router', () => {
  it('picks local-rules when offline without provider mock', () => {
    expect(pickAiEngine('offline')).toMatch(/local/)
  })
})
