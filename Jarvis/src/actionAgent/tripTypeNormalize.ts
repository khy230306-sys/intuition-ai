/**
 * Trip type normalization with controlled aliases + small edit-distance
 * for common STT/typo variants (완복 → 왕복).
 */

export type TripTypeNorm = 'one_way' | 'round_trip'

const ROUND_EXACT = [
  '왕복',
  '완복',
  '왕뽁',
  '왕복이야',
  '왕복으로',
  '왕복할게',
  '왕복할거야',
  '왕복이요',
  '왕복요',
  '갔다가와',
  '갔다올거야',
  '갔다올께',
  '왔다갔다',
  '돌아올거야',
  '돌아올께',
  '왕복으로갈게',
]

const ONE_WAY_EXACT = [
  '편도',
  '편도야',
  '편도로',
  '편도이요',
  '편도요',
  '편도할게',
  '가는것만',
  '갈때만',
  '오는건필요없어',
  '오는건없어',
  '편도로갈게',
]

function compact(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.!?~]+$/g, '')
}

/** Levenshtein distance for short Korean tokens. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function phraseRoundTrip(t: string): boolean {
  return (
    /갔다가\s*와/.test(t) ||
    /갔다\s*올\s*(거야|께|게)/.test(t) ||
    /왔다\s*갔다/.test(t) ||
    /돌아\s*올\s*(거야|께|게)/.test(t) ||
    /왕\s*복/.test(t)
  )
}

function phraseOneWay(t: string): boolean {
  return (
    /가는\s*것만/.test(t) ||
    /갈\s*때만/.test(t) ||
    /오는\s*건\s*(필요\s*)?없/.test(t) ||
    /편\s*도/.test(t)
  )
}

/**
 * Normalize utterance → trip type.
 * Controlled: exact aliases, phrase patterns, then edit-distance≤1 on 2–3 char cores.
 */
export function normalizeTripType(text: string): {
  tripType: TripTypeNorm | null
  normalizedInput: string
  matchedVia: string | null
} {
  const raw = text.trim()
  const c = compact(raw)
  if (!c) return { tripType: null, normalizedInput: c, matchedVia: null }

  if (ROUND_EXACT.includes(c)) {
    return { tripType: 'round_trip', normalizedInput: c, matchedVia: 'alias_round' }
  }
  if (ONE_WAY_EXACT.includes(c)) {
    return { tripType: 'one_way', normalizedInput: c, matchedVia: 'alias_one_way' }
  }
  if (phraseRoundTrip(raw) && !phraseOneWay(raw)) {
    return { tripType: 'round_trip', normalizedInput: c, matchedVia: 'phrase_round' }
  }
  if (phraseOneWay(raw) && !phraseRoundTrip(raw)) {
    return { tripType: 'one_way', normalizedInput: c, matchedVia: 'phrase_one_way' }
  }

  // Short core tokens only — avoid aggressive fuzzy on long utterances
  if (c.length <= 4) {
    if (editDistance(c, '왕복') <= 1 || editDistance(c, '완복') <= 1) {
      return { tripType: 'round_trip', normalizedInput: c, matchedVia: 'edit_round' }
    }
    if (editDistance(c, '편도') <= 1) {
      return { tripType: 'one_way', normalizedInput: c, matchedVia: 'edit_one_way' }
    }
  }

  // 「왕복으로」 already covered; strip trailing particles for short cores
  const stripped = c.replace(/(이야|으로|할게|할거야|이요|요)$/u, '')
  if (stripped !== c && stripped.length >= 2 && stripped.length <= 4) {
    if (editDistance(stripped, '왕복') <= 1) {
      return { tripType: 'round_trip', normalizedInput: stripped, matchedVia: 'edit_round_strip' }
    }
    if (editDistance(stripped, '편도') <= 1) {
      return { tripType: 'one_way', normalizedInput: stripped, matchedVia: 'edit_one_way_strip' }
    }
  }

  return { tripType: null, normalizedInput: c, matchedVia: null }
}
