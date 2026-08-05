import type { SourceConfidence } from '../types'
import type { FusedContext } from './contextTypes'

export function overallConfidence(ctx: FusedContext): number {
  const vals = Object.values(ctx.confidence).map((c) => (c.stale ? c.confidence * 0.5 : c.confidence))
  if (!vals.length) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

export function markStaleIfOld(conf: SourceConfidence, maxAgeMs: number): SourceConfidence {
  if (!conf.updatedAt) return { ...conf, stale: true }
  const age = Date.now() - Date.parse(conf.updatedAt)
  if (!Number.isFinite(age) || age > maxAgeMs) return { ...conf, stale: true }
  return conf
}
