import { isLifeOs2Enabled } from '../featureFlags'
import { fuseContext } from '../context-fusion/contextFusionEngine'
import { emitLifeOs2Event } from '../lifeEventBus'
import {
  ruleDeparture,
  ruleGoalDelay,
  ruleReminderVolume,
  ruleStalledProjects,
} from './predictionRules'
import { rememberPrediction, wasRecentlyEmitted, pruneExpired } from './predictionHistory'
import type { Prediction } from './predictionTypes'

export type PredictOptions = {
  /** Only set when Navigation actually computed ETA. */
  navEtaMinutes?: number | null
  force?: boolean
}

export function generatePredictions(opts?: PredictOptions): Prediction[] {
  if (!isLifeOs2Enabled('predictionEnabled')) return []
  pruneExpired()
  const ctx = fuseContext({ force: opts?.force })
  if (!ctx) return []

  const drafts = [
    ...ruleStalledProjects(ctx),
    ...ruleGoalDelay(ctx),
    ...ruleReminderVolume(ctx),
    ...ruleDeparture(ctx, opts?.navEtaMinutes ?? null),
  ].filter((d) => d.confidence >= 0.5)

  const out: Prediction[] = []
  for (const d of drafts) {
    if (wasRecentlyEmitted(d.type, d.title)) continue
    const saved = rememberPrediction(d)
    out.push(saved)
    emitLifeOs2Event('prediction.created', { type: saved.type, confidence: saved.confidence })
  }
  return out
}

export function formatPredictions(preds: Prediction[]): string {
  if (!preds.length) {
    return '현재 데이터로는 신뢰할 만한 예측이 없습니다. (부족한 항목을 임의로 만들지 않았습니다.)'
  }
  return [
    '【예측 · 가능성】',
    ...preds.map(
      (p) =>
        `• [${p.severity}] ${p.title}\n  이유: ${p.reason}\n  신뢰도: ${Math.round(p.confidence * 100)}% · 유효 ${p.validUntil}`,
    ),
    '확정 표현이 아닙니다. Navigation ETA가 없으면 출발 여유를 계산하지 않습니다.',
  ].join('\n')
}

export function answerPredictionQuery(text: string): string {
  const t = text.trim()
  if (/출발|여유/.test(t)) {
    // Without nav ETA — honest refusal
    const preds = generatePredictions({ navEtaMinutes: null })
    const dep = preds.find((p) => p.type === 'departure')
    if (!dep) {
      return '이동시간이 Navigation에서 제공되지 않아 출발 여유를 계산하지 않았습니다. 길안내로 경로를 먼저 확인해 주세요.'
    }
    return formatPredictions([dep])
  }
  if (/정체|멈춘\s*프로젝트|오래\s*멈/.test(t)) {
    const preds = generatePredictions().filter((p) => p.type === 'stalled_project')
    return formatPredictions(preds)
  }
  if (/목표\s*달성|이번\s*주/.test(t)) {
    const preds = generatePredictions().filter((p) => p.type === 'goal_delay')
    return formatPredictions(preds.length ? preds : generatePredictions())
  }
  if (/놓치|일정/.test(t)) {
    return formatPredictions(generatePredictions())
  }
  return formatPredictions(generatePredictions())
}
