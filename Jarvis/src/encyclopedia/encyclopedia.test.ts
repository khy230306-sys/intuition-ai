import { describe, expect, it, vi, beforeEach } from 'vitest'
import { extractKnowledgeTopic, isKnowledgeQuestion, stripChatPasteNoise } from './queryParse'
import { answerEncyclopedia } from './encyclopediaEngine'

describe('encyclopedia query parse', () => {
  it('detects definition asks and strips paste noise', () => {
    expect(isKnowledgeQuestion('Ra ahn 아 무슨뜻이야?')).toBe(true)
    expect(stripChatPasteNoise('성 성규 13:28 Ra ahn 아 무슨뜻이야?')).toMatch(/Ra ahn/)
    expect(extractKnowledgeTopic('Ra ahn 아 무슨뜻이야?')).toMatch(/Ra\s*ahn/i)
    expect(extractKnowledgeTopic('성 성규 13:28 Ra ahn 아 무슨뜻이야?')).toMatch(/Ra/i)
    expect(extractKnowledgeTopic('서울이 뭐야?')).toBe('서울')
  })

  it('does not steal reminders', () => {
    expect(isKnowledgeQuestion('오후 3시에 알려줘 회의')).toBe(false)
  })
})

describe('answerEncyclopedia', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('formats wiki summary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const u = String(url)
        if (u.includes('opensearch')) {
          return {
            ok: true,
            json: async () => ['Ra', ['Ra'], [''], ['https://en.wikipedia.org/wiki/Ra']],
          }
        }
        if (u.includes('summary')) {
          return {
            ok: true,
            json: async () => ({
              type: 'standard',
              title: 'Ra',
              extract: 'Ra is the ancient Egyptian deity of the sun.',
              content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ra' } },
            }),
          }
        }
        return { ok: false, json: async () => ({}) }
      }),
    )
    const ans = await answerEncyclopedia('Ra 무슨 뜻이야?')
    expect(ans).toMatch(/Ra/)
    expect(ans).toMatch(/Egyptian|sun|출처/)
  })
})
