import type { AnalysisContext, EngineResult } from '../domain/types'

export interface AnalysisEngine {
  id: string
  name: string
  version: string
  analyze(context: AnalysisContext): Promise<EngineResult>
}

export function emptyScores(): Record<number, number> {
  const o: Record<number, number> = {}
  for (let n = 1; n <= 45; n++) o[n] = 50
  return o
}

export function rankFromScores(scores: Record<number, number>): number[] {
  return Object.entries(scores)
    .map(([n, s]) => ({ n: Number(n), s }))
    .sort((a, b) => b.s - a.s || a.n - b.n)
    .map((x) => x.n)
}

export function appearanceIndexes(
  draws: { numbers: number[]; drawNumber: number }[],
  n: number,
): number[] {
  const idxs: number[] = []
  draws.forEach((d, i) => {
    if (d.numbers.includes(n)) idxs.push(i)
  })
  return idxs
}
