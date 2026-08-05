import { isLifeOs2Enabled } from '../featureFlags'
import { emitLifeOs2Event } from '../lifeEventBus'
import { upsertExtended } from './relationshipRepository'
import { formatRelationshipOverview, searchRelatedLocal } from './relationshipContext'
import type { ExtendedRelationKind } from './relationshipTypes'

function detectKind(text: string): ExtendedRelationKind {
  if (/외주|거래처|클라이언트|담당자/.test(text)) return 'client'
  if (/부장|과장|대리|동료|회사|팀/.test(text)) return 'coworker'
  if (/친구/.test(text)) return 'friend'
  if (/엄마|아빠|가족|아들|딸|아내|남편/.test(text)) return 'family'
  if (/보호자/.test(text)) return 'guardian'
  return 'other'
}

/** Parse 「김부장은 AIZIO 외주 담당자야」 style — only when explicit. */
export function saveRelationshipFromText(text: string): string | null {
  if (!isLifeOs2Enabled('relationshipEngine2Enabled')) return null
  const m =
    text.match(/([가-힣A-Za-z]{2,20})(?:은|는|이|가)\s*(.+?)(?:야|이야|입니다|이에요)/) ||
    text.match(/([가-힣A-Za-z]{2,20})\s*(?:는|은)\s*(.+)/)
  if (!m) return null
  if (!/담당|외주|동료|친구|부장|과장|거래|팀|보호자|아는\s*사람|지인/.test(text)) {
    // Avoid stealing family memory skill — let legacy handle 「엄마 이름은」
    if (/엄마|아빠|이름/.test(text)) return null
  }
  const name = m[1].trim()
  const rest = m[2].trim()
  const kind = detectKind(text)
  const org = /AIZIO|회사|팀/.test(rest) ? rest.slice(0, 60) : ''
  const rec = upsertExtended({
    name,
    kind,
    org,
    notes: rest.slice(0, 200),
    relatedProjectNames: /AIZIO/i.test(text) ? ['AIZIO'] : [],
  })
  emitLifeOs2Event('relationship.saved', { id: rec.id })
  return `기억했습니다: ${rec.name} (${rec.kind})${rec.org ? ` · ${rec.org}` : ''}. 연락처를 자동 수집하지 않았습니다.`
}

export function handleRelationshipQuery(text: string): string | null {
  if (!isLifeOs2Enabled('relationshipEngine2Enabled')) return null
  if (/관계\s*목록|저장된\s*관계/.test(text)) return formatRelationshipOverview()

  const saved = saveRelationshipFromText(text)
  if (saved) return saved

  const related = text.match(/([가-힣A-Za-z]{2,20})\s*(?:관련|과\s*관련|이랑|하고).*(?:일정|메모|얘기|대화)/)
  const person = related?.[1] || text.match(/(?:엄마|아빠|김부장|[가-힣]{2,10})/)?.[0]
  if (person && /일정|메모|관련|마지막/.test(text)) {
    const r = searchRelatedLocal(person)
    const lines = [`【${r.person} 관련】`]
    if (r.extended) lines.push(`확장: ${r.extended}`)
    if (r.legacy) lines.push(`기존: ${r.legacy}`)
    lines.push(r.schedules.length ? `일정·알림:\n${r.schedules.map((s) => `• ${s}`).join('\n')}` : '일정·알림: (없음)')
    lines.push(r.notes.length ? `메모:\n${r.notes.map((s) => `• ${s}`).join('\n')}` : '메모: (없음)')
    if (/마지막\s*얘기|무슨\s*얘기/.test(text) && !r.notes.length) {
      lines.push('대화 원문 로그를 임의로 재구성하지 않습니다.')
    }
    return lines.join('\n')
  }
  return null
}

export { formatRelationshipOverview, searchRelatedLocal }
