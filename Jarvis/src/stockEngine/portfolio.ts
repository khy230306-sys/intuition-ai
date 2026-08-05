import { analyzeHolding, fetchQuote, formatMoney } from '../finance'
import { loadHoldings, loadWatchlist } from '../storage'
import { REC_UNIVERSE } from './universe'

export async function buildPortfolioReport(): Promise<string> {
  const holdings = loadHoldings()
  if (!holdings.length) {
    return [
      '【AIZIO 주식엔진 · 포트폴리오】',
      '보유 종목이 없습니다.',
      '예: 「보유 삼성전자 10주 평단 70000」',
      '또는 투자 탭에서 등록하세요.',
    ].join('\n')
  }

  const quotes = await Promise.all(
    holdings.map(async (h) => {
      try {
        return await fetchQuote(h.symbol, { allowProxy: false, timeoutMs: 2200 })
      } catch {
        return null
      }
    }),
  )

  type Row = {
    name: string
    symbol: string
    currency: 'KRW' | 'USD'
    value: number
    cost: number
    pnl: number
    pnlPct: number
    sector: string
  }

  const rows: Row[] = holdings.map((h, i) => {
    const q = quotes[i]
    const price = q?.price ?? h.avgPrice
    const value = price * h.shares
    const cost = h.avgPrice * h.shares
    const pnl = value - cost
    const pnlPct = cost ? (pnl / cost) * 100 : 0
    const sector = REC_UNIVERSE.find((c) => c.symbol.toUpperCase() === h.symbol.toUpperCase())?.sector || '기타'
    return {
      name: h.name,
      symbol: h.symbol,
      currency: h.currency,
      value,
      cost,
      pnl,
      pnlPct,
      sector,
    }
  })

  let totalKrw = 0
  let totalUsd = 0
  let costKrw = 0
  let costUsd = 0
  for (const r of rows) {
    if (r.currency === 'KRW') {
      totalKrw += r.value
      costKrw += r.cost
    } else {
      totalUsd += r.value
      costUsd += r.cost
    }
  }

  const bySector = new Map<string, number>()
  const weightBaseKrw = totalKrw || 1
  const weightBaseUsd = totalUsd || 1
  for (const r of rows) {
    const w =
      r.currency === 'KRW' ? (totalKrw ? r.value / weightBaseKrw : 0) : totalUsd ? r.value / weightBaseUsd : 0
    bySector.set(r.sector, (bySector.get(r.sector) || 0) + w)
  }

  const lines: string[] = ['【AIZIO 주식엔진 · 포트폴리오】', '']

  holdings.forEach((h, i) => {
    lines.push(analyzeHolding(h, quotes[i]))
    const r = rows[i]
    const base = r.currency === 'KRW' ? totalKrw : totalUsd
    const weight = base > 0 ? (r.value / base) * 100 : 0
    lines.push(`비중(통화별) ${weight.toFixed(1)}% · 섹터 ${r.sector}`)
    lines.push('')
  })

  if (totalKrw) {
    const pnl = totalKrw - costKrw
    const pct = costKrw ? (pnl / costKrw) * 100 : 0
    lines.push(
      `KRW 평가 ${formatMoney(totalKrw, 'KRW')} · 손익 ${pnl >= 0 ? '+' : ''}${formatMoney(pnl, 'KRW')} (${pct.toFixed(1)}%)`,
    )
  }
  if (totalUsd) {
    const pnl = totalUsd - costUsd
    const pct = costUsd ? (pnl / costUsd) * 100 : 0
    lines.push(
      `USD 평가 ${formatMoney(totalUsd, 'USD')} · 손익 ${pnl >= 0 ? '+' : ''}${formatMoney(pnl, 'USD')} (${pct.toFixed(1)}%)`,
    )
  }

  const sectorLines = [...bySector.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([s, w]) => `${s} ${(w * 100).toFixed(0)}%`)
  if (sectorLines.length) {
    lines.push('')
    lines.push(`섹터 분포: ${sectorLines.join(' · ')}`)
  }

  const heavy = rows
    .map((r) => {
      const base = r.currency === 'KRW' ? totalKrw : totalUsd
      return { ...r, w: base > 0 ? r.value / base : 0 }
    })
    .filter((r) => r.w >= 0.2)
  if (heavy.length) {
    lines.push('')
    lines.push('집중 주의: ' + heavy.map((h) => `${h.name} ${(h.w * 100).toFixed(0)}%`).join(', '))
  }

  const watch = loadWatchlist()
  // Watch target vs live quotes (lightweight)
  const watchHits: string[] = []
  for (const w of watch.slice(0, 10)) {
    if (!w.targetPrice) continue
    try {
      const q = await fetchQuote(w.symbol, { allowProxy: false, timeoutMs: 1800 })
      if (!q) continue
      const dist = ((w.targetPrice - q.price) / q.price) * 100
      if (Math.abs(dist) <= 3) {
        watchHits.push(
          `${w.name} 목표가 ${formatMoney(w.targetPrice, q.currency)} 근접 (${dist >= 0 ? '+' : ''}${dist.toFixed(1)}%)`,
        )
      }
    } catch {
      /* ignore */
    }
  }
  if (watchHits.length) {
    lines.push('')
    lines.push('목표가 근접: ' + watchHits.join(' / '))
  }

  lines.push('')
  lines.push('면책: 시세 지연·오류 가능. 통화 간 환산 합산은 하지 않습니다. 투자 책임은 본인에게 있습니다.')
  return lines.join('\n')
}
