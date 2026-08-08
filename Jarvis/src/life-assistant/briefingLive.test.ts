import { describe, expect, it } from 'vitest'
import {
  briefingLiveNeedsRefresh,
  formatMarketLine,
  marketTone,
  parseGoogleNewsRss,
  type BriefingLiveCache,
  type BriefingMarketSnap,
} from './briefingLive'

describe('briefingLive', () => {
  it('parses Google News RSS items', () => {
    const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title>서울 이슬비 계속 - 연합뉴스</title>
        <link>https://news.example/1</link>
        <pubDate>Sat, 09 Aug 2025 02:00:00 GMT</pubDate>
        <source>연합뉴스</source>
      </item>
      <item>
        <title><![CDATA[코스피 반등 시도 - 한국경제]]></title>
        <link>https://news.example/2</link>
        <pubDate>Sat, 09 Aug 2025 01:30:00 GMT</pubDate>
      </item>
    </channel></rss>`
    const items = parseGoogleNewsRss(xml, 4)
    expect(items).toHaveLength(2)
    expect(items[0]!.title).toContain('서울 이슬비')
    expect(items[0]!.source).toMatch(/연합/)
    expect(items[0]!.link).toContain('https://')
    expect(items[1]!.title).toContain('코스피')
  })

  it('formats market lines and tone', () => {
    const up: BriefingMarketSnap = {
      symbol: '^KS11',
      name: '코스피',
      price: 2650.12,
      changePct: 1.23,
      fetchedAt: Date.now(),
      source: 'live',
    }
    const down: BriefingMarketSnap = { ...up, name: '코스닥', changePct: -0.45, price: 850 }
    expect(formatMarketLine(up)).toMatch(/2,650/)
    expect(formatMarketLine(up)).toMatch(/▲1\.23%/)
    expect(marketTone(up)).toBe('up')
    expect(marketTone(down)).toBe('down')
    expect(marketTone({ ...up, changePct: null })).toBe('flat')
    // Absurd index swings are hidden
    expect(formatMarketLine({ ...up, changePct: 10.98 })).not.toMatch(/%/)
    expect(marketTone({ ...up, changePct: 10.98 })).toBe('flat')
  })

  it('detects stale cache for refresh', () => {
    const fresh: BriefingLiveCache = {
      markets: [
        {
          symbol: '^KS11',
          name: '코스피',
          price: 1,
          changePct: 0,
          fetchedAt: Date.now(),
          source: 'live',
        },
        {
          symbol: '^KQ11',
          name: '코스닥',
          price: 1,
          changePct: 0,
          fetchedAt: Date.now(),
          source: 'live',
        },
      ],
      news: [{ id: '1', title: 't', source: 's', link: '', publishedAt: null }],
      fetchedAt: Date.now(),
      marketsAt: Date.now(),
      newsAt: Date.now(),
    }
    expect(briefingLiveNeedsRefresh(fresh).markets).toBe(false)
    expect(briefingLiveNeedsRefresh(fresh).news).toBe(false)
    expect(briefingLiveNeedsRefresh(null).markets).toBe(true)
    const stale = {
      ...fresh,
      marketsAt: Date.now() - 10 * 60_000,
      newsAt: Date.now() - 20 * 60_000,
    }
    expect(briefingLiveNeedsRefresh(stale).markets).toBe(true)
    expect(briefingLiveNeedsRefresh(stale).news).toBe(true)
  })
})
