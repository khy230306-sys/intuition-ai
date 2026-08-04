import { hasConsent } from '../consentManager'
import { isLifeFeatureEnabled } from '../featureFlags'
import { emitLifeEvent } from '../lifeEventBus'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'
import type { TimelineEvent, TimelineEventType } from './timelineTypes'

const KEY = 'aizio_life_timeline_v1'
const SCHEMA = 1

export function loadTimeline(): TimelineEvent[] {
  return loadStoreList<TimelineEvent>(KEY, SCHEMA)
}

export function addTimelineEvent(input: {
  type: TimelineEventType
  title: string
  summary?: string
  sourceId?: string
  sourceType?: string
  importance?: number
  occurredAt?: string
  userPinned?: boolean
}): TimelineEvent | null {
  if (!isLifeFeatureEnabled('timelineEnabled')) return null
  if (!hasConsent('timeline')) return null
  const now = nowIso()
  const ev: TimelineEvent = {
    id: lifeId('tl'),
    type: input.type,
    title: input.title.slice(0, 160),
    summary: (input.summary || '').slice(0, 400),
    occurredAt: input.occurredAt || now,
    sourceId: input.sourceId || '',
    sourceType: input.sourceType || input.type,
    importance: input.importance ?? 0.5,
    userPinned: Boolean(input.userPinned),
    privacyLevel: 'private',
    createdAt: now,
  }
  const items = loadTimeline()
  items.unshift(ev)
  saveStoreList(KEY, SCHEMA, items, 400)
  emitLifeEvent('timeline.added', { id: ev.id })
  return ev
}

export function listTimeline(opts?: { since?: string; type?: TimelineEventType; limit?: number }): TimelineEvent[] {
  let items = loadTimeline()
  if (opts?.type) items = items.filter((e) => e.type === opts.type)
  if (opts?.since) {
    const t = Date.parse(opts.since)
    if (!Number.isNaN(t)) items = items.filter((e) => Date.parse(e.occurredAt) >= t)
  }
  return items.slice(0, opts?.limit ?? 40)
}

export function formatTimeline(opts?: { since?: string }): string {
  const items = listTimeline({ since: opts?.since, limit: 20 })
  if (!items.length) return '타임라인에 저장된 중요 사건이 없습니다.'
  return [
    '【Life Timeline】',
    ...items.map((e) => `• ${e.occurredAt.slice(0, 10)} · ${e.title}`),
  ].join('\n')
}
