#!/usr/bin/env node
/**
 * Build-time quote snapshot (no CORS). Written into public/ so the PWA
 * can recommend stocks even when Yahoo blocks browser requests.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'quote-snapshot.json')

const SYMBOLS = [
  '005930.KS',
  '000660.KS',
  '035420.KS',
  '035720.KS',
  '005380.KS',
  '000270.KS',
  '105560.KS',
  '055550.KS',
  '005490.KS',
  '068270.KS',
  '373220.KS',
  '012450.KS',
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'META',
  'NVDA',
  'TSM',
  'TSLA',
  'SPY',
  'QQQ',
  'VOO',
  'SCHD',
]

async function fetchOne(symbol) {
  const hosts = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com']
  for (const host of hosts) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; JarvisQuoteBot/1.0)',
        },
      })
      if (!res.ok) continue
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) continue
      const prev = meta.chartPreviousClose ?? meta.previousClose
      const changePct =
        prev && prev !== 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : null
      return {
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        price: meta.regularMarketPrice,
        currency: meta.currency || (symbol.includes('.KS') ? 'KRW' : 'USD'),
        changePct,
        dayHigh: meta.regularMarketDayHigh ?? null,
        dayLow: meta.regularMarketDayLow ?? null,
        fiftyTwoHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoLow: meta.fiftyTwoWeekLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        marketState: meta.marketState,
        fetchedAt: Date.now(),
      }
    } catch {
      /* try next host */
    }
  }
  return null
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const quotes = {}
  for (const sym of SYMBOLS) {
    const q = await fetchOne(sym)
    if (q) quotes[sym.toUpperCase()] = q
    await sleep(120)
  }
  const payload = {
    fetchedAt: Date.now(),
    count: Object.keys(quotes).length,
    quotes,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(payload))
  console.log(`[quote-snapshot] wrote ${payload.count}/${SYMBOLS.length} → ${outPath}`)
  if (payload.count === 0) {
    console.warn('[quote-snapshot] WARNING: empty snapshot (Yahoo may be rate-limited)')
  }
}

main().catch((err) => {
  console.error(err)
  // Don't fail the build — ship empty snapshot and rely on offline structural picks
  writeFileSync(outPath, JSON.stringify({ fetchedAt: Date.now(), count: 0, quotes: {} }))
  process.exit(0)
})
