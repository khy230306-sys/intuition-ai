import { hasConsent } from '../consentManager'
import { looksLikeMedicalDiagnosisClaim } from '../privacyPolicy'
import { loadStoreList, saveStoreList } from '../lifeRepository'
import { lifeId, nowIso } from '../types'

export type HealthLog = {
  id: string
  kind: 'sleep' | 'water' | 'exercise' | 'medication' | 'hospital' | 'other'
  note: string
  createdAt: string
}

const KEY = 'aizio_life_health_v1'
const SCHEMA = 1

export function addHealthLog(kind: HealthLog['kind'], note: string): { ok: boolean; message: string } {
  if (!hasConsent('health')) return { ok: false, message: '건강 기록 동의가 꺼져 있습니다.' }
  if (looksLikeMedicalDiagnosisClaim(note)) {
    return { ok: false, message: '의료 진단·치료 지시는 저장하거나 제공하지 않습니다.' }
  }
  const items = loadStoreList<HealthLog>(KEY, SCHEMA)
  items.unshift({ id: lifeId('hl'), kind, note: note.slice(0, 200), createdAt: nowIso() })
  saveStoreList(KEY, SCHEMA, items, 200)
  return { ok: true, message: `건강 생활 기록을 저장했습니다 (${kind}). 진단이 아닙니다.` }
}

export function formatHealthLogs(): string {
  const items = loadStoreList<HealthLog>(KEY, SCHEMA).slice(0, 15)
  if (!items.length) return '건강 생활 기록이 없습니다. 예: 「물 마셨다고 기록해」'
  return ['【건강 기록 · 생활 로그만】', ...items.map((i) => `• ${i.createdAt.slice(0, 10)} ${i.kind}: ${i.note}`)].join(
    '\n',
  )
}
