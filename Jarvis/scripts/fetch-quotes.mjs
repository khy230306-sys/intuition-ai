#!/usr/bin/env node
/**
 * Build-time quote snapshot (no CORS). Written into public/ so the PWA
 * can screen stocks even when Yahoo blocks browser requests.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'public', 'quote-snapshot.json')

/** Keep in sync with src/stockEngine/universe.ts symbols. */
const SYMBOLS = [
  '005930.KS',
  '000660.KS',
  '042700.KS',
  '009150.KS',
  '035420.KS',
  '035720.KS',
  '036570.KS',
  '259960.KS',
  '352820.KS',
  '251270.KS',
  '005380.KS',
  '000270.KS',
  '012330.KS',
  '105560.KS',
  '055550.KS',
  '086790.KS',
  '316140.KS',
  '024110.KS',
  '032830.KS',
  '000810.KS',
  '005490.KS',
  '051910.KS',
  '003670.KS',
  '006400.KS',
  '373220.KS',
  '096770.KS',
  '068270.KS',
  '207940.KS',
  '326030.KS',
  '012450.KS',
  '047810.KS',
  '079550.KS',
  '064350.KS',
  '034020.KS',
  '015760.KS',
  '267250.KS',
  '011200.KS',
  '010130.KS',
  '066570.KS',
  '018260.KS',
  '030200.KS',
  '017670.KS',
  '033780.KS',
  '090430.KS',
  '028260.KS',
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'META',
  'NVDA',
  'AMD',
  'AVGO',
  'TSM',
  'QCOM',
  'MU',
  'AMAT',
  'ASML',
  'INTC',
  'ORCL',
  'CRM',
  'ADBE',
  'NOW',
  'TSLA',
  'JPM',
  'BAC',
  'V',
  'MA',
  'BRK-B',
  'XOM',
  'CVX',
  'UNH',
  'LLY',
  'JNJ',
  'ABBV',
  'NFLX',
  'COST',
  'WMT',
  'HD',
  'DIS',
  'KO',
  'MCD',
  'BA',
  'CAT',
  'GE',
  'SPY',
  'QQQ',
  'VOO',
  'VTI',
  'IWM',
  'DIA',
  'SCHD',
  'VYM',
  'SMH',
  'SOXX',
  'QLD',
  'TQQQ',
]

async function fetchOne(symbol) {
  const hosts = ['https://query2.finance.yahoo.com', 'https://query1.finance.yahoo.com']
  for (const host of hosts) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AizioQuoteBot/2.1)',
        },
      })
      if (!res.ok) continue
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      const meta = result?.meta
      if (!meta?.regularMarketPrice) continue
      const prev = meta.chartPreviousClose ?? meta.previousClose
      let changePct =
        prev && prev !== 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : null
      if (changePct != null && Math.abs(changePct) > 25) changePct = null

      const closes = (result?.indicators?.quote?.[0]?.close || []).filter(
        (x) => typeof x === 'number' && Number.isFinite(x) && x > 0,
      )
      const volumes = (result?.indicators?.quote?.[0]?.volume || []).filter(
        (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0,
      )
      let ret5dPct = null
      if (closes.length >= 2) {
        const first = closes[0]
        const last = closes[closes.length - 1]
        if (first > 0) {
          const pct = ((last - first) / first) * 100
          if (Number.isFinite(pct) && Math.abs(pct) <= 40) ret5dPct = pct
        }
      }
      let avgVolume5d = null
      if (volumes.length >= 2) {
        const prior = volumes.slice(0, -1)
        avgVolume5d = prior.reduce((a, b) => a + b, 0) / prior.length
      }

      return {
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        price: meta.regularMarketPrice,
        currency: meta.currency || (symbol.includes('.KS') || symbol.includes('.KQ') ? 'KRW' : 'USD'),
        changePct,
        dayHigh: meta.regularMarketDayHigh ?? null,
        dayLow: meta.regularMarketDayLow ?? null,
        fiftyTwoHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoLow: meta.fiftyTwoWeekLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        ret5dPct,
        avgVolume5d,
        marketState: meta.marketState,
        fetchedAt: Date.now(),
        source: 'snapshot',
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
  mkdirSync(dirname(outPath), { recursive: true })
  const quotes = {}
  let ok = 0
  for (const symbol of SYMBOLS) {
    const q = await fetchOne(symbol)
    if (q) {
      quotes[symbol.toUpperCase()] = q
      if (q.symbol && q.symbol.toUpperCase() !== symbol.toUpperCase()) {
        quotes[q.symbol.toUpperCase()] = q
      }
      ok += 1
    }
    await sleep(80)
  }
  const payload = { fetchedAt: Date.now(), count: ok, quotes }
  writeFileSync(outPath, JSON.stringify(payload))
  console.log(`[quote-snapshot] wrote ${ok}/${SYMBOLS.length} → ${outPath}`)
  if (ok < 8) {
    console.warn('[quote-snapshot] few quotes — network may be blocked; bundling partial snapshot')
  }
}

main().catch((err) => {
  console.error(err)
  writeFileSync(outPath, JSON.stringify({ fetchedAt: Date.now(), count: 0, quotes: {} }))
  process.exit(0)
})
