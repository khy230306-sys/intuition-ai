import type { BlindLevel } from '@/types'
import { createId } from '@/utils/id'

export type BlindTemplateKey =
  | 'turbo'
  | 'standard'
  | 'deepstack'
  | 'hyper'
  | 'satellite'
  | 'small30'
  | 'medium100'
  | 'large300'

function level(
  n: number,
  minutes: number,
  sb: number,
  bb: number,
  opts: Partial<BlindLevel> = {},
): BlindLevel {
  return {
    id: createId('lvl'),
    levelNumber: n,
    durationMinutes: minutes,
    smallBlind: sb,
    bigBlind: bb,
    bigBlindAnte: opts.bigBlindAnte ?? 0,
    ante: opts.ante ?? 0,
    isBreak: opts.isBreak ?? false,
    breakMinutes: opts.breakMinutes,
    isRegistrationClose: opts.isRegistrationClose ?? false,
    isRebuyEnd: opts.isRebuyEnd ?? false,
    isAddonAvailable: opts.isAddonAvailable ?? false,
    isChipRace: opts.isChipRace ?? false,
  }
}

function breakLevel(n: number, minutes: number): BlindLevel {
  return level(n, minutes, 0, 0, { isBreak: true, breakMinutes: minutes })
}

function generateStructure(
  minutes: number,
  startSb: number,
  count: number,
  withBreakEvery = 4,
): BlindLevel[] {
  const levels: BlindLevel[] = []
  let sb = startSb
  let num = 1
  for (let i = 0; i < count; i += 1) {
    const bb = sb * 2
    const anteStart = i >= 2
    levels.push(
      level(num, minutes, sb, bb, {
        bigBlindAnte: anteStart ? bb : 0,
        isRegistrationClose: i === 5,
        isRebuyEnd: i === 6,
        isAddonAvailable: i === 5,
      }),
    )
    num += 1
    if (withBreakEvery > 0 && (i + 1) % withBreakEvery === 0 && i < count - 1) {
      levels.push(breakLevel(num, 10))
      num += 1
    }
    sb = Math.round(sb * 1.5)
    if (sb % 25 !== 0 && sb > 100) sb = Math.round(sb / 25) * 25
  }
  return renumber(levels)
}

export function renumber(levels: BlindLevel[]): BlindLevel[] {
  return levels.map((l, i) => ({ ...l, levelNumber: i + 1 }))
}

export function createBlindTemplate(key: BlindTemplateKey): BlindLevel[] {
  switch (key) {
    case 'turbo':
      return generateStructure(10, 100, 12, 4)
    case 'hyper':
      return generateStructure(5, 100, 10, 5)
    case 'deepstack':
      return generateStructure(20, 100, 14, 3)
    case 'satellite':
      return generateStructure(12, 100, 10, 4)
    case 'small30':
      return generateStructure(15, 100, 10, 3)
    case 'medium100':
      return generateStructure(15, 100, 14, 4)
    case 'large300':
      return generateStructure(20, 100, 18, 3)
    case 'standard':
    default:
      return generateStructure(15, 100, 12, 4)
  }
}

export const BLIND_TEMPLATE_LABELS: Record<BlindTemplateKey, string> = {
  turbo: '터보',
  standard: '일반',
  deepstack: '딥스택',
  hyper: '하이퍼 터보',
  satellite: '새틀라이트',
  small30: '30명 소규모',
  medium100: '100명 중형',
  large300: '300명 대형',
}

export function autoGenerateBlinds(
  startSb: number,
  levels: number,
  minutes: number,
): BlindLevel[] {
  return generateStructure(minutes, startSb, levels, 4)
}

export function totalDurationMinutes(levels: BlindLevel[]): number {
  return levels.reduce((sum, l) => {
    if (l.isBreak) return sum + (l.breakMinutes ?? l.durationMinutes)
    return sum + l.durationMinutes
  }, 0)
}

export function demoBlindLevels(): BlindLevel[] {
  const base = createBlindTemplate('standard')
  // Align demo: level 3 = 200/400 BB ante 400, remaining ~12 min context
  return base.map((l) => {
    if (l.levelNumber === 3) {
      return {
        ...l,
        smallBlind: 200,
        bigBlind: 400,
        bigBlindAnte: 400,
        durationMinutes: 15,
      }
    }
    return l
  })
}
