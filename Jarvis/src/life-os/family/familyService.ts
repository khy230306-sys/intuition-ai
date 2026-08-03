import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'

export type FamilyMember = {
  id: string
  name: string
  relation: string
  language: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type FamilyNotice = {
  id: string
  text: string
  createdAt: string
}

export type FamilySpaceState = {
  members: FamilyMember[]
  notices: FamilyNotice[]
  serverLinked: false
  note: string
}

const KEY = 'aizio_life_family_space_v1'
const SCHEMA = 1

export function loadFamilySpace(): FamilySpaceState {
  const members = loadStoreList<FamilyMember>(KEY + '_members', SCHEMA)
  const notices = loadStoreList<FamilyNotice>(KEY + '_notices', SCHEMA)
  return {
    members,
    notices,
    serverLinked: false,
    note: '로컬 가족 프로필만 지원합니다. 다중 사용자 실시간 서버 공유는 미연결입니다.',
  }
}

export function upsertFamilyMember(name: string, relation: string): FamilyMember {
  const items = loadStoreList<FamilyMember>(KEY + '_members', SCHEMA)
  const now = nowIso()
  const existing = items.find((m) => m.name === name.trim())
  if (existing) {
    existing.relation = relation || existing.relation
    existing.updatedAt = now
    saveStoreList(KEY + '_members', SCHEMA, items, 40)
    return existing
  }
  const m: FamilyMember = {
    id: lifeId('fam'),
    name: name.trim().slice(0, 40),
    relation: relation.slice(0, 40),
    language: 'ko',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
  items.unshift(m)
  saveStoreList(KEY + '_members', SCHEMA, items, 40)
  return m
}

export function formatFamilyOverview(): string {
  const s = loadFamilySpace()
  const lines = ['【가족 공간 · 로컬】', s.note]
  if (!s.members.length) lines.push('등록된 로컬 프로필이 없습니다. 「가족 프로필에 엄마 추가」처럼 말해 주세요.')
  else lines.push(...s.members.map((m) => `• ${m.name} (${m.relation}) · 언어 ${m.language}`))
  lines.push('기존 가족 탭의 대화·일정·관계 기억은 그대로 유지됩니다.')
  return lines.join('\n')
}
