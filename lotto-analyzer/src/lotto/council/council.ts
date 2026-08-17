import type { CouncilVote, EngineResult } from '../domain/types'
import { MAX_N } from '../domain/types'

export interface CouncilEntry {
  number: number
  votes: Record<string, CouncilVote>
  consensus: CouncilVote
  supportScore: number
}

export function classifyVote(score: number): CouncilVote {
  if (score >= 75) return 'strong_for'
  if (score >= 58) return 'for'
  if (score >= 42) return 'neutral'
  if (score >= 25) return 'against'
  return 'strong_against'
}

const VOTE_WEIGHT: Record<CouncilVote, number> = {
  strong_for: 2,
  for: 1,
  neutral: 0,
  against: -1,
  strong_against: -2,
}

export function consensusFromVotes(votes: CouncilVote[]): CouncilVote {
  if (!votes.length) return 'neutral'
  const avg =
    votes.reduce((s, v) => s + VOTE_WEIGHT[v], 0) / votes.length
  if (avg >= 1.25) return 'strong_for'
  if (avg >= 0.35) return 'for'
  if (avg <= -1.25) return 'strong_against'
  if (avg <= -0.35) return 'against'
  return 'neutral'
}

export function buildCouncil(results: EngineResult[]): CouncilEntry[] {
  const entries: CouncilEntry[] = []

  for (let n = 1; n <= MAX_N; n++) {
    const votes: Record<string, CouncilVote> = {}
    const voteList: CouncilVote[] = []
    let scoreSum = 0
    let scoreCount = 0

    for (const r of results) {
      const score = r.numberScores[n] ?? 50
      const vote = classifyVote(score)
      votes[r.engineId] = vote
      voteList.push(vote)
      scoreSum += score
      scoreCount++
    }

    entries.push({
      number: n,
      votes,
      consensus: consensusFromVotes(voteList),
      supportScore: scoreCount ? scoreSum / scoreCount : 50,
    })
  }

  return entries
}

export function councilSummary(entries: CouncilEntry[]): Record<CouncilVote, number> {
  const summary: Record<CouncilVote, number> = {
    strong_for: 0,
    for: 0,
    neutral: 0,
    against: 0,
    strong_against: 0,
  }
  for (const e of entries) summary[e.consensus]++
  return summary
}
