import type { Outcome } from './types'

/**
 * Parse pasted road text into chronological outcomes.
 * Supports: P/B/T, PLAYER/BANKER/TIE, 플레이어/뱅커/타이, 파랑/빨강, etc.
 */
export function parseRoadText(raw: string): Outcome[] {
  const s = raw.trim()
  if (!s) return []

  const tokens =
    s.match(/뱅커|플레이어|타이|BANKER|PLAYER|TIE|[BPT]|빨강|파랑|빨간|파란|Banker|Player|Tie/gi) ??
    []

  const out: Outcome[] = []
  for (const t of tokens) {
    const u = t.toUpperCase()
    if (
      u === 'B' ||
      u === 'BANKER' ||
      t === '뱅커' ||
      t === '빨강' ||
      t === '빨간'
    ) {
      out.push('B')
    } else if (
      u === 'P' ||
      u === 'PLAYER' ||
      t === '플레이어' ||
      t === '파랑' ||
      t === '파란'
    ) {
      out.push('P')
    } else if (u === 'T' || u === 'TIE' || t === '타이') {
      out.push('T')
    }
  }
  return out
}

export function roadToDisplay(outcomes: readonly Outcome[]): string {
  return outcomes.join(' ')
}
