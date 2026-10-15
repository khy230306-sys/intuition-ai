import type { BetSelection } from '../game/types'
import { BUNDLE_CATALOG, type BundlePick } from './bundles'
import { formatPick } from './labels'

export type BundleAmountMode = 'SPLIT_TOTAL' | 'EACH_FULL'

export type SelectionInput = {
  duelPick: string | null
  totalPick: string | null
  extraPick: BundlePick | null
  bundleIds: string[]
  stake: number
  amountMode: BundleAmountMode
}

export type ResolvedPick = {
  mode: string
  choice: string
  stake: number
}

export function pickKey(mode: string, choice: string): string {
  return `${mode}:${choice}`
}

export function collectUniquePicks(input: Omit<SelectionInput, 'stake' | 'amountMode'>): BundlePick[] {
  const map = new Map<string, BundlePick>()

  const add = (pick: BundlePick | null | undefined) => {
    if (!pick) return
    map.set(pickKey(pick.mode, pick.choice), pick)
  }

  if (input.duelPick) add({ mode: 'CARD_DUEL', choice: input.duelPick })
  if (input.totalPick) add({ mode: 'TOTAL', choice: input.totalPick })
  add(input.extraPick)

  for (const id of input.bundleIds) {
    const bundle = BUNDLE_CATALOG.find((item) => item.id === id)
    if (!bundle) continue
    for (const pick of bundle.picks) add(pick)
  }

  return [...map.values()]
}

export function allocateStakes(
  picks: BundlePick[],
  stake: number,
  amountMode: BundleAmountMode,
): ResolvedPick[] {
  if (picks.length === 0 || stake <= 0) return []

  if (amountMode === 'EACH_FULL') {
    return picks.map((pick) => ({ ...pick, stake }))
  }

  const base = Math.floor(stake / picks.length)
  let remainder = stake - base * picks.length
  return picks.map((pick) => {
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    return { ...pick, stake: base + extra }
  })
}

export function resolveSelections(input: SelectionInput): {
  picks: ResolvedPick[]
  totalStake: number
  selections: BetSelection[]
} {
  const unique = collectUniquePicks(input)
  const picks = allocateStakes(unique, input.stake, input.amountMode)
  const totalStake =
    input.amountMode === 'EACH_FULL' ? input.stake * picks.length : picks.length > 0 ? input.stake : 0

  return {
    picks,
    totalStake,
    selections: picks.map((pick) => ({
      mode: pick.mode as BetSelection['mode'],
      choice: pick.choice,
      stake: pick.stake,
    })),
  }
}

export function summarizeSelection(input: SelectionInput): {
  lines: string[]
  totalStake: number
  pickCount: number
} {
  const resolved = resolveSelections(input)
  const lines = resolved.picks.map(
    (pick) => `${formatPick(pick.mode, pick.choice)} · ${pick.stake}`,
  )
  return {
    lines,
    totalStake: resolved.totalStake,
    pickCount: resolved.picks.length,
  }
}
