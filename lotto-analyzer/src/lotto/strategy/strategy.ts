import type { GeneratorConstraints, GeneratorMode, Strategy } from '../domain/types'
import { DEFAULT_MASTER_WEIGHTS } from '../engines/master/masterEngine'

export const STRATEGY_VERSION = '3.0.0'

export interface StrategyPreset {
  id: string
  name: string
  description: string
  mode: GeneratorMode
  weights: Record<string, number>
}

export const BALANCED_WEIGHTS: Record<string, number> = {
  trend: 1,
  delay: 1,
  cycle: 1,
  pair: 1,
  triple: 1,
  network: 1,
  structure: 1,
  repeat: 1,
  ending: 1,
  gap: 1,
  contrarian: 1,
  monte: 1,
  random: 0,
}

export const TREND_WEIGHTS: Record<string, number> = {
  trend: 2.5,
  delay: 0.3,
  cycle: 0.5,
  pair: 0.4,
  triple: 0.3,
  network: 0.4,
  structure: 0.6,
  repeat: 0.5,
  ending: 0.4,
  gap: 0.4,
  contrarian: 0.2,
  monte: 0.5,
  random: 0,
}

export const DELAY_WEIGHTS: Record<string, number> = {
  trend: 0.4,
  delay: 2.5,
  cycle: 0.8,
  pair: 0.4,
  triple: 0.3,
  network: 0.3,
  structure: 0.5,
  repeat: 0.4,
  ending: 0.4,
  gap: 0.6,
  contrarian: 0.3,
  monte: 0.4,
  random: 0,
}

export const RELATION_WEIGHTS: Record<string, number> = {
  trend: 0.5,
  delay: 0.4,
  cycle: 0.5,
  pair: 2.0,
  triple: 1.5,
  network: 1.2,
  structure: 0.5,
  repeat: 0.4,
  ending: 0.5,
  gap: 0.4,
  contrarian: 0.3,
  monte: 0.5,
  random: 0,
}

export const CONTRARIAN_WEIGHTS: Record<string, number> = {
  trend: 0.3,
  delay: 0.5,
  cycle: 0.4,
  pair: 0.4,
  triple: 0.3,
  network: 0.3,
  structure: 0.5,
  repeat: 0.3,
  ending: 0.4,
  gap: 0.4,
  contrarian: 2.5,
  monte: 0.4,
  random: 0,
}

export const COVERAGE_WEIGHTS: Record<string, number> = {
  ...DEFAULT_MASTER_WEIGHTS,
  structure: 1.3,
  pair: 1.1,
}

export const EXPERIMENT_WEIGHTS: Record<string, number> = {
  trend: 0.8,
  delay: 0.8,
  cycle: 0.8,
  pair: 0.8,
  triple: 0.8,
  network: 0.8,
  structure: 0.8,
  repeat: 0.8,
  ending: 0.8,
  gap: 0.8,
  contrarian: 0.8,
  monte: 2.0,
  random: 0.3,
}

export const RANDOM_WEIGHTS: Record<string, number> = {
  trend: 0,
  delay: 0,
  cycle: 0,
  pair: 0,
  triple: 0,
  network: 0,
  structure: 0,
  repeat: 0,
  ending: 0,
  gap: 0,
  contrarian: 0,
  monte: 0,
  random: 1,
}

export function defaultWeights(mode: GeneratorMode): Record<string, number> {
  switch (mode) {
    case 'MASTER':
      return { ...DEFAULT_MASTER_WEIGHTS }
    case 'BALANCED':
      return { ...BALANCED_WEIGHTS }
    case 'TREND':
      return { ...TREND_WEIGHTS }
    case 'DELAY':
      return { ...DELAY_WEIGHTS }
    case 'RELATION':
      return { ...RELATION_WEIGHTS }
    case 'CONTRARIAN':
      return { ...CONTRARIAN_WEIGHTS }
    case 'COVERAGE':
      return { ...COVERAGE_WEIGHTS }
    case 'EXPERIMENT':
      return { ...EXPERIMENT_WEIGHTS }
    case 'RANDOM':
      return { ...RANDOM_WEIGHTS }
    default:
      return { ...DEFAULT_MASTER_WEIGHTS }
  }
}

export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, w]) => w > 0)
  if (!entries.length) return { ...weights }
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const out: Record<string, number> = {}
  for (const [k, w] of Object.entries(weights)) {
    out[k] = w > 0 ? w / total : 0
  }
  return out
}

export function createStrategy(
  name: string,
  mode: GeneratorMode,
  constraints: Omit<GeneratorConstraints, 'mode'>,
  options?: { description?: string; weights?: Record<string, number>; id?: string },
): Strategy {
  const now = new Date().toISOString()
  return {
    id: options?.id ?? `strategy-${Date.now()}`,
    name,
    description: options?.description ?? `${mode} strategy`,
    weights: options?.weights ?? defaultWeights(mode),
    constraints: { ...constraints, mode },
    version: STRATEGY_VERSION,
    createdAt: now,
    updatedAt: now,
  }
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'preset-master',
    name: 'Master',
    description: 'Weighted ensemble of all engines',
    mode: 'MASTER',
    weights: defaultWeights('MASTER'),
  },
  {
    id: 'preset-balanced',
    name: 'Balanced',
    description: 'Equal-weight council blend',
    mode: 'BALANCED',
    weights: defaultWeights('BALANCED'),
  },
  {
    id: 'preset-trend',
    name: 'Trend',
    description: 'Recent frequency momentum',
    mode: 'TREND',
    weights: defaultWeights('TREND'),
  },
  {
    id: 'preset-delay',
    name: 'Delay',
    description: 'Overdue number focus',
    mode: 'DELAY',
    weights: defaultWeights('DELAY'),
  },
  {
    id: 'preset-relation',
    name: 'Relation',
    description: 'Pair and network affinity',
    mode: 'RELATION',
    weights: defaultWeights('RELATION'),
  },
  {
    id: 'preset-contrarian',
    name: 'Contrarian',
    description: 'Fade recent hot numbers',
    mode: 'CONTRARIAN',
    weights: defaultWeights('CONTRARIAN'),
  },
  {
    id: 'preset-coverage',
    name: 'Coverage',
    description: 'Spread exposure across numbers',
    mode: 'COVERAGE',
    weights: defaultWeights('COVERAGE'),
  },
  {
    id: 'preset-experiment',
    name: 'Experiment',
    description: 'Monte Carlo exploration',
    mode: 'EXPERIMENT',
    weights: defaultWeights('EXPERIMENT'),
  },
  {
    id: 'preset-random',
    name: 'Random',
    description: 'Unbiased random baseline',
    mode: 'RANDOM',
    weights: defaultWeights('RANDOM'),
  },
]

export function listPresets(): StrategyPreset[] {
  return [...STRATEGY_PRESETS]
}

export function presetByMode(mode: GeneratorMode): StrategyPreset | undefined {
  return STRATEGY_PRESETS.find((p) => p.mode === mode)
}
