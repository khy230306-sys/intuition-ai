import type { ExtraMode, PrimaryMode } from '../game/types'
import type { BundleAmountMode } from './selection'

const choiceLabels: Record<string, string> = {
  DOWN: '하',
  SAME: '무',
  UP: '상',
  LOW: '낮음',
  CENTER: '중앙',
  HIGH: '높음',
  ODD: '홀',
  EVEN: '짝',
  PAIR: '같은 숫자',
  NO_PAIR: '다른 숫자',
}

const modeLabels: Record<string, string> = {
  CARD_DUEL: '카드 비교',
  TOTAL: '합계',
  ODD_EVEN: '홀짝',
  PAIR: '같은 숫자',
  EXACT_TOTAL: '합계 맞히기',
}

const choiceIcons: Record<string, string> = {
  DOWN: '↓',
  SAME: '●',
  UP: '↑',
  LOW: '↓',
  CENTER: '●',
  HIGH: '↑',
  ODD: '홀',
  EVEN: '짝',
  PAIR: '=',
  NO_PAIR: '≠',
}

export const BUNDLE_MODE_LABELS: Record<BundleAmountMode, string> = {
  SPLIT_TOTAL: '총 금액 균등 분배',
  EACH_FULL: '각 항목 동일 금액',
}

export function labelChoice(choice: string): string {
  if (/^\d+$/.test(choice)) return `합계 ${choice}`
  return choiceLabels[choice] ?? choice
}

export function labelMode(mode: string): string {
  return modeLabels[mode] ?? mode
}

export function iconChoice(choice: string): string {
  return choiceIcons[choice] ?? ''
}

export function choiceButtonText(choice: string): string {
  if (choice === 'CENTER') return `${iconChoice(choice)} 중앙(6)`
  const icon = iconChoice(choice)
  const label = labelChoice(choice)
  return icon ? `${icon} ${label}` : label
}

export function modeButtonText(mode: PrimaryMode | ExtraMode): string {
  return labelMode(mode)
}

export function formatPick(mode: string, choice: string): string {
  return `${labelMode(mode)} ${labelChoice(choice)}`
}

export function englishHint(choiceOrMode: string): string {
  return choiceOrMode
}
