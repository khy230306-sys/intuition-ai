import { primaryLabel } from './catalog'
import { parseRelationshipUtterance } from './parse'
import {
  deleteRelationshipByQuery,
  findByRelationCode,
  loadRelationships,
  upsertRelationship,
} from './storage'

export type RelationshipSkillReply = {
  text: string
  speakText?: string
  handled: boolean
}

export function handleRelationshipText(raw: string): RelationshipSkillReply | null {
  const parsed = parseRelationshipUtterance(raw)
  if (!parsed) return null

  if (parsed.kind === 'list') {
    const items = loadRelationships()
    if (!items.length) {
      return {
        handled: true,
        text: '저장된 가족·관계 기억이 없어요. 예: 「우리 엄마 이름은 김영희야」',
        speakText: '저장된 관계가 없어요.',
      }
    }
    const lines = items.map((r) => {
      const name = r.name ? `${r.name} 님` : '(이름 없음)'
      return `• ${r.displayRelation}: ${name}`
    })
    return { handled: true, text: `【관계 기억】\n${lines.join('\n')}`, speakText: `관계 ${items.length}명이에요.` }
  }

  if (parsed.kind === 'ask_name') {
    const hit = findByRelationCode(parsed.relationship)
    if (!hit?.name) {
      return {
        handled: true,
        text: `${parsed.displayRelation} 이름이 아직 없어요. 「${parsed.displayRelation} 이름은 …야」로 알려 주세요.`,
        speakText: '이름이 아직 없어요.',
      }
    }
    return {
      handled: true,
      text: `${parsed.displayRelation} 이름은 ${hit.name} 님이에요.`,
      speakText: `${parsed.displayRelation} 이름은 ${hit.name}예요.`,
    }
  }

  if (parsed.kind === 'forget') {
    const removed = deleteRelationshipByQuery(parsed.query)
    if (!removed) {
      return { handled: true, text: '지울 관계 기억을 찾지 못했어요.', speakText: '찾지 못했어요.' }
    }
    return {
      handled: true,
      text: `${removed.displayRelation}${removed.name ? ` (${removed.name})` : ''} 기억을 삭제했어요.`,
      speakText: '삭제했어요.',
    }
  }

  // remember / update
  if (parsed.name === null && parsed.kind === 'remember') {
    // Allow relation-only later via schedule text; here require name for remember phrasing
  }
  const rec = upsertRelationship({
    relationship: parsed.relationship,
    displayRelation: parsed.displayRelation || primaryLabel(parsed.relationship),
    name: parsed.name,
    aliases: parsed.aliases,
  })
  const label = rec.displayRelation
  if (rec.name) {
    return {
      handled: true,
      text: `기억해 둘게요. ${rec.name} 님은 사용자의 ${label}입니다.`,
      speakText: `${rec.name} 님을 ${label}로 기억할게요.`,
    }
  }
  return {
    handled: true,
    text: `${label} 관계를 기억해 두었어요. 이름을 알려 주시면 함께 저장할게요.`,
    speakText: `${label} 관계를 기억했어요.`,
  }
}
