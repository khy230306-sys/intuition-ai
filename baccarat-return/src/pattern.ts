import type { BigRoad, BigRoadCell, Mark, Outcome } from './types'

const MAX_ROWS = 6

/** Parse free text into B/P/T outcomes. Accepts Korean labels too. */
export function parsePattern(raw: string): Outcome[] {
  const out: Outcome[] = []
  const s = raw.trim().toUpperCase()
  if (!s) return out

  // Token-first: B/P/T, 뱅커/플레이어/타이, 빨간/파란 etc.
  const tokens = s.match(/뱅커|플레이어|타이|BANKER|PLAYER|TIE|[BPT]|빨강|파랑|빨간|파란/g)
  if (tokens && tokens.length > 0) {
    for (const t of tokens) {
      if (t === 'B' || t === 'BANKER' || t === '뱅커' || t === '빨강' || t === '빨간') out.push('B')
      else if (t === 'P' || t === 'PLAYER' || t === '플레이어' || t === '파랑' || t === '파란') out.push('P')
      else out.push('T')
    }
    return out
  }

  for (const ch of s.replace(/[^BPT]/g, '')) {
    if (ch === 'B' || ch === 'P' || ch === 'T') out.push(ch)
  }
  return out
}

export function patternToText(pattern: Outcome[]): string {
  return pattern.join('')
}

export function countableLength(pattern: Outcome[]): number {
  return pattern.filter((o) => o !== 'T').length
}

/** Build Big Road from chronological outcomes (ties attach to previous bead). */
export function toBigRoad(pattern: Outcome[]): BigRoad {
  const road: BigRoad = []
  let last: BigRoadCell | null = null

  for (const o of pattern) {
    if (o === 'T') {
      if (last) last.tiesAfter += 1
      continue
    }

    if (!last || last.outcome !== o) {
      // Start new column, or snake if previous column is full and same color streak continues via dragon tail — keep classic: new column on change.
      const col: BigRoadCell[] = [{ outcome: o, tiesAfter: 0 }]
      road.push(col)
      last = col[0]!
      continue
    }

    const col = road[road.length - 1]!
    if (col.length < MAX_ROWS) {
      const cell: BigRoadCell = { outcome: o, tiesAfter: 0 }
      col.push(cell)
      last = cell
    } else {
      // Dragon tail: continue same result to the right at bottom row
      const cell: BigRoadCell = { outcome: o, tiesAfter: 0 }
      road.push([cell])
      // Represent as single-cell column; renderer places at row MAX_ROWS-1 for dragon.
      // Simpler UX: still append as new short column — fine for practice board.
      last = cell
    }
  }

  return road
}

/** Visible road after revealing `revealedCount` non-tie outcomes (ties before them included). */
export function revealedPattern(pattern: Outcome[], revealedCountable: number): Outcome[] {
  if (revealedCountable <= 0) return []
  let count = 0
  const out: Outcome[] = []
  for (const o of pattern) {
    out.push(o)
    if (o !== 'T') {
      count += 1
      if (count >= revealedCountable) break
    }
  }
  return out
}

/**
 * Advance past leading ties from `index`, returning announcements and next index.
 * Ties never count as success/failure.
 */
export function skipTies(
  pattern: Outcome[],
  index: number,
): { index: number; ties: number } {
  let i = index
  let ties = 0
  while (i < pattern.length && pattern[i] === 'T') {
    ties += 1
    i += 1
  }
  return { index: i, ties }
}

export function judgeGuess(
  pattern: Outcome[],
  index: number,
  guess: 'B' | 'P',
): { ok: boolean; nextIndex: number; expected: Outcome | null } {
  const { index: i } = skipTies(pattern, index)
  if (i >= pattern.length) return { ok: false, nextIndex: i, expected: null }
  const expected = pattern[i]!
  if (expected === 'T') return { ok: false, nextIndex: i, expected }
  const ok = expected === guess
  return { ok, nextIndex: ok ? i + 1 : i, expected }
}

export function summarizeMarks(marks: Mark[]): { hits: number; misses: number; rate: number | null } {
  const hits = marks.filter((m) => m === 'O').length
  const misses = marks.filter((m) => m === 'X').length
  const total = hits + misses
  return { hits, misses, rate: total === 0 ? null : hits / total }
}
