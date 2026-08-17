import type { GeneratorMode } from '../domain/types'
import { MAX_N, PICK } from '../domain/types'
import type { UserConstraints } from '../persistence/store'

export interface ParsedNlConstraints {
  fixed: number[]
  excluded: number[]
  watch: number[]
  gameCount?: number
  modeHint?: GeneratorMode
  preferDelay?: boolean
  reduceHot?: boolean
  rawNotes: string[]
  errors: string[]
}

const MODE_HINTS: { re: RegExp; mode: GeneratorMode }[] = [
  { re: /트렌드|최근.?많이|핫/, mode: 'TREND' },
  { re: /미출현|오래.?안|딜레이|냉/, mode: 'DELAY' },
  { re: /역추세|콘트라|반대로/, mode: 'CONTRARIAN' },
  { re: /관계|페어|동반/, mode: 'RELATION' },
  { re: /커버|분산/, mode: 'COVERAGE' },
  { re: /랜덤|무작위/, mode: 'RANDOM' },
  { re: /균형|밸런스/, mode: 'BALANCED' },
  { re: /마스터|종합/, mode: 'MASTER' },
]

function uniqSorted(nums: number[]): number[] {
  return [...new Set(nums)].filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_N).sort((a, b) => a - b)
}

/**
 * Rule-based NL → constraints. Does not call external AI.
 * Always validate before applying.
 */
export function parseNaturalLanguageConstraints(text: string): ParsedNlConstraints {
  const errors: string[] = []
  const rawNotes: string[] = []
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) {
    return {
      fixed: [],
      excluded: [],
      watch: [],
      rawNotes: [],
      errors: ['조건을 입력해 주세요.'],
    }
  }

  const fixed: number[] = []
  const excluded: number[] = []
  const watch: number[] = []

  const fixRe =
    /(\d{1,2})\s*번?\s*(?:은|를|을)?\s*(?:고정|포함|넣어|넣어줘|고정하고)/g
  let m: RegExpExecArray | null
  while ((m = fixRe.exec(t))) {
    fixed.push(Number(m[1]))
  }

  const exclRe =
    /(\d{1,2})\s*번?\s*(?:은|를|을)?\s*(?:제외|빼고|빼줘|제외하고)/g
  while ((m = exclRe.exec(t))) {
    excluded.push(Number(m[1]))
  }

  const watchRe = /(\d{1,2})\s*번?\s*(?:은|를|을)?\s*(?:관심|지켜)/g
  while ((m = watchRe.exec(t))) {
    watch.push(Number(m[1]))
  }

  // "21번은 고정하고" style already covered; also "고정: 1,2,3"
  const listFix = t.match(/고정\s*[:：]?\s*([\d,\s]+)/)
  if (listFix?.[1]) {
    fixed.push(...listFix[1].split(/[,\s]+/).map(Number).filter(Boolean))
  }
  const listEx = t.match(/제외\s*[:：]?\s*([\d,\s]+)/)
  if (listEx?.[1]) {
    excluded.push(...listEx[1].split(/[,\s]+/).map(Number).filter(Boolean))
  }

  let gameCount: number | undefined
  const gc = t.match(/(\d+)\s*게임/)
  if (gc) gameCount = Math.max(1, Math.min(20, Number(gc[1])))

  let modeHint: GeneratorMode | undefined
  for (const h of MODE_HINTS) {
    if (h.re.test(t)) {
      modeHint = h.mode
      break
    }
  }

  const preferDelay = /장기\s*미출현|미출현\s*\d+|오래\s*안\s*나온/.test(t)
  const reduceHot = /최근\s*많이\s*나온|핫.*줄|과열.*줄/.test(t)
  if (preferDelay) rawNotes.push('장기 미출현 선호 힌트')
  if (reduceHot) rawNotes.push('최근 과열 완화 힌트')

  const f = uniqSorted(fixed)
  const e = uniqSorted(excluded)
  const w = uniqSorted(watch)

  const conflict = f.filter((n) => e.includes(n))
  if (conflict.length) {
    errors.push(`고정수와 제외수가 충돌합니다: ${conflict.join(', ')}`)
  }
  if (f.length > PICK) {
    errors.push(`고정수는 최대 ${PICK}개까지입니다.`)
  }

  return {
    fixed: f,
    excluded: e,
    watch: w,
    gameCount,
    modeHint,
    preferDelay,
    reduceHot,
    rawNotes,
    errors,
  }
}

export function mergeParsedConstraints(
  current: UserConstraints,
  parsed: ParsedNlConstraints,
): UserConstraints {
  if (parsed.errors.length) return current
  return {
    fixed: parsed.fixed.length ? parsed.fixed : current.fixed,
    excluded: parsed.excluded.length ? parsed.excluded : current.excluded,
    watch: parsed.watch.length ? parsed.watch : current.watch,
  }
}
