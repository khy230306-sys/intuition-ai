/**
 * Live home-briefing feeds: KOSPI/KOSDAQ + Korean breaking news.
 * Uses existing Yahoo quote pipeline + Google News RSS (multi-proxy + snapshot).
 * Offline-first: serves localStorage cache, then refreshes in background.
 */

import { fetchQuote, sanitizeChangePct } from '../finance'
import type { QuoteSnapshot } from '../types'

export type BriefingMarketSnap = {
  symbol: string
  name: string
  price: number
  changePct: number | null
  marketState?: string
  fetchedAt: number
  source: 'live' | 'proxy' | 'snapshot' | 'cache'
}

export type BriefingNewsItem = {
  id: string
  title: string
  source: string
  link: string
  publishedAt: number | null
}

export type BriefingLiveCache = {
  markets: BriefingMarketSnap[]
  news: BriefingNewsItem[]
  fetchedAt: number
  marketsAt: number
  newsAt: number
}

const CACHE_KEY = 'aizio.briefing.live.v1'
const MARKET_TTL_MS = 2 * 60_000
const NEWS_TTL_MS = 5 * 60_000
const MAX_NEWS = 4

const INDEXES: Array<{ query: string; name: string }> = [
  { query: '코스피', name: '코스피' },
  { query: '코스닥', name: '코스닥' },
]

const NEWS_RSS = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'

let memory: BriefingLiveCache | null = null
let inflight: Promise<BriefingLiveCache> | null = null
let newsSnap: { fetchedAt: number; news: BriefingNewsItem[] } | null | undefined
let newsSnapPromise: Promise<typeof newsSnap> | null = null

function readCache(): BriefingLiveCache | null {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BriefingLiveCache
    if (!parsed || !Array.isArray(parsed.markets)) return null
    memory = parsed
    return parsed
  } catch {
    return null
  }
}

function writeCache(cache: BriefingLiveCache): void {
  memory = cache
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* quota */
  }
}

export function loadBriefingLiveCache(): BriefingLiveCache | null {
  return readCache()
}

function clampIndexPct(pct: number | null): number | null {
  const s = sanitizeChangePct(pct)
  if (s == null) return null
  // Index day moves beyond ~8% are almost always bad meta/prevClose.
  if (Math.abs(s) > 8) return null
  return s
}

export function formatMarketLine(m: BriefingMarketSnap): string {
  const pct = clampIndexPct(m.changePct)
  const ch =
    pct == null ? '' : ` ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct).toFixed(2)}%`
  const price =
    m.price >= 100
      ? Math.round(m.price).toLocaleString('ko-KR')
      : m.price.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  return `${price}${ch}`
}

export function marketTone(m: BriefingMarketSnap): 'up' | 'down' | 'flat' {
  const pct = clampIndexPct(m.changePct)
  if (pct == null || pct === 0) return 'flat'
  return pct > 0 ? 'up' : 'down'
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function stripHtml(s: string): string {
  return decodeXml(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse Google News RSS item list (exported for unit tests). */
export function parseGoogleNewsRss(xml: string, limit = MAX_NEWS): BriefingNewsItem[] {
  const items: BriefingNewsItem[] = []
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  for (const block of blocks) {
    const title = stripHtml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '')
    const link = stripHtml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '')
    const pubRaw = stripHtml((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '')
    const source =
      stripHtml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || '') || '뉴스'
    if (!title) continue
    let clean = title
    let src = source
    const dash = title.lastIndexOf(' - ')
    if (dash > 8) {
      clean = title.slice(0, dash).trim()
      src = title.slice(dash + 3).trim() || source
    }
    const publishedAt = pubRaw ? Date.parse(pubRaw) || null : null
    items.push({
      id: `n${items.length}-${clean.slice(0, 24)}`,
      title: clean.slice(0, 90),
      source: src.slice(0, 40),
      link: link.startsWith('http') ? link : '',
      publishedAt: publishedAt && Number.isFinite(publishedAt) ? publishedAt : null,
    })
    if (items.length >= limit) break
  }
  return items
}

async function loadNewsSnapshot(): Promise<BriefingNewsItem[]> {
  if (newsSnap !== undefined) return newsSnap?.news || []
  if (!newsSnapPromise) {
    newsSnapPromise = (async () => {
      try {
        const url =
          typeof window !== 'undefined'
            ? new URL('news-snapshot.json', window.location.href).href
            : './news-snapshot.json'
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) {
          newsSnap = null
          return newsSnap
        }
        const data = (await res.json()) as { fetchedAt?: number; news?: BriefingNewsItem[] }
        newsSnap = { fetchedAt: data.fetchedAt || 0, news: data.news || [] }
        return newsSnap
      } catch {
        newsSnap = null
        return newsSnap
      }
    })()
  }
  const snap = await newsSnapPromise
  return snap?.news || []
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, application/json, */*' },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRssXml(): Promise<string | null> {
  const encoded = encodeURIComponent(NEWS_RSS)
  const candidates = [
    NEWS_RSS,
    `https://api.allorigins.win/raw?url=${encoded}`,
    `https://api.allorigins.win/get?url=${encoded}`,
    `https://corsproxy.io/?${encoded}`,
  ]
  for (const url of candidates) {
    const text = await fetchText(url, url === NEWS_RSS ? 4000 : 8000)
    if (!text) continue
    // allorigins get wraps JSON
    if (text.trimStart().startsWith('{')) {
      try {
        const j = JSON.parse(text) as { contents?: string }
        if (j.contents && j.contents.includes('<item')) return j.contents
      } catch {
        /* next */
      }
      continue
    }
    if (text.includes('<item')) return text
  }
  return null
}

async function fetchMarkets(): Promise<BriefingMarketSnap[]> {
  const out: BriefingMarketSnap[] = []
  // Sequential with retries — parallel proxy storms often drop one index.
  for (const idx of INDEXES) {
    let hit: QuoteSnapshot | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        hit = await fetchQuote(idx.query, {
          allowProxy: true,
          timeoutMs: attempt === 0 ? 4000 : 5500,
        })
        if (hit) break
      } catch {
        /* retry */
      }
    }
    if (!hit) {
      // Bundled snapshot last resort (build includes ^KS11 / ^KQ11)
      try {
        hit = await fetchQuote(idx.query, { preferSnapshot: true, allowProxy: false, timeoutMs: 1500 })
      } catch {
        hit = null
      }
    }
    if (hit) out.push(quoteToMarket(hit, idx.name))
  }
  out.sort((a, b) => {
    const rank = (n: string) => (n.includes('코스피') || n === 'KOSPI' ? 0 : 1)
    return rank(a.name) - rank(b.name)
  })
  return out
}

function quoteToMarket(q: QuoteSnapshot, name: string): BriefingMarketSnap {
  return {
    symbol: q.symbol,
    name,
    price: q.price,
    changePct: clampIndexPct(q.changePct),
    marketState: q.marketState,
    fetchedAt: q.fetchedAt || Date.now(),
    source: (q.source as BriefingMarketSnap['source']) || 'live',
  }
}

async function fetchNews(): Promise<BriefingNewsItem[]> {
  const xml = await fetchRssXml()
  if (xml) {
    const parsed = parseGoogleNewsRss(xml, MAX_NEWS)
    if (parsed.length) return parsed
  }
  const snap = await loadNewsSnapshot()
  return snap.slice(0, MAX_NEWS).map((n, i) => ({ ...n, id: n.id || `snap-${i}` }))
}

export function briefingLiveNeedsRefresh(
  cache: BriefingLiveCache | null = readCache(),
  now = Date.now(),
): { markets: boolean; news: boolean } {
  if (!cache) return { markets: true, news: true }
  return {
    markets: now - (cache.marketsAt || 0) > MARKET_TTL_MS || cache.markets.length < 2,
    news: now - (cache.newsAt || 0) > NEWS_TTL_MS || cache.news.length === 0,
  }
}

/** Refresh live feeds; merges with existing cache on partial failure. */
export async function refreshBriefingLive(opts?: {
  force?: boolean
}): Promise<BriefingLiveCache> {
  const force = opts?.force === true
  const prev = readCache()
  const need = briefingLiveNeedsRefresh(prev)
  if (!force && prev && !need.markets && !need.news) return prev
  if (inflight) return inflight

  inflight = (async () => {
    const base: BriefingLiveCache = prev
      ? {
          markets: [...prev.markets],
          news: [...prev.news],
          fetchedAt: prev.fetchedAt,
          marketsAt: prev.marketsAt,
          newsAt: prev.newsAt,
        }
      : {
          markets: [],
          news: [],
          fetchedAt: 0,
          marketsAt: 0,
          newsAt: 0,
        }

    const tasks: Promise<void>[] = []
    if (force || need.markets) {
      tasks.push(
        fetchMarkets().then((markets) => {
          if (markets.length) {
            // Merge by name so a partial fetch doesn't drop the other index
            const map = new Map(base.markets.map((m) => [m.name, m]))
            for (const m of markets) map.set(m.name, m)
            base.markets = [...map.values()].sort((a, b) => {
              const rank = (n: string) => (n.includes('코스피') ? 0 : 1)
              return rank(a.name) - rank(b.name)
            })
            base.marketsAt = Date.now()
          }
        }),
      )
    }
    if (force || need.news) {
      tasks.push(
        fetchNews().then((news) => {
          if (news.length) {
            base.news = news
            base.newsAt = Date.now()
          }
        }),
      )
    }
    await Promise.all(tasks)
    base.fetchedAt = Date.now()
    writeCache(base)
    return base
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Ensure cache is warm; kick a background refresh when stale. */
export function ensureBriefingLiveFresh(): void {
  const need = briefingLiveNeedsRefresh()
  if (need.markets || need.news) void refreshBriefingLive()
}
