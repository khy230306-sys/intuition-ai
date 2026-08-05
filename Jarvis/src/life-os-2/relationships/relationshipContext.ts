import { loadRelationships } from '../../relationship/storage'
import { loadReminders } from '../../storage'
import { loadMemory } from '../../storage'
import { findExtended, loadExtendedRelationships } from './relationshipRepository'

/** Search related local data — never invent people. */
export function searchRelatedLocal(nameHint: string): {
  person: string
  schedules: string[]
  notes: string[]
  legacy: string | null
  extended: string | null
} {
  const q = nameHint.trim()
  const ext = findExtended(q)
  const legacy = loadRelationships().find(
    (r) =>
      (r.name && r.name.includes(q)) ||
      r.displayRelation.includes(q) ||
      (r.aliases || []).some((a) => a.includes(q)),
  )
  const person = ext?.name || legacy?.name || q
  const schedules = loadReminders()
    .filter((r) => !r.done && r.text.includes(person))
    .map((r) => r.text)
    .slice(0, 8)
  let notes: string[] = []
  try {
    const mem = loadMemory()
    notes = mem
      .filter((m) => `${m.key} ${m.value}`.includes(person))
      .map((m) => `${m.key}: ${m.value}`)
      .slice(0, 8)
  } catch {
    notes = []
  }
  return {
    person,
    schedules,
    notes,
    legacy: legacy ? `${legacy.displayRelation}${legacy.name ? ` · ${legacy.name}` : ''}` : null,
    extended: ext ? `${ext.name} (${ext.kind})${ext.org ? ` · ${ext.org}` : ''}` : null,
  }
}

export function formatRelationshipOverview(): string {
  const ext = loadExtendedRelationships()
  const legacy = loadRelationships()
  const lines = ['【관계 엔진 2.0】', '기존 가족관계 기억은 그대로 사용합니다.']
  if (legacy.length) {
    lines.push('— 기존 관계 —')
    lines.push(
      ...legacy.slice(0, 10).map((r) => `• ${r.displayRelation}${r.name ? `: ${r.name}` : ''}`),
    )
  }
  if (ext.length) {
    lines.push('— 확장 관계 —')
    lines.push(...ext.slice(0, 10).map((r) => `• ${r.name} (${r.kind})${r.org ? ` · ${r.org}` : ''}`))
  }
  if (!legacy.length && !ext.length) lines.push('저장된 관계가 없습니다. 임의로 만들지 않습니다.')
  return lines.join('\n')
}
