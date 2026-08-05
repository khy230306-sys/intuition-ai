import { hasConsent } from '../consentManager'
import { appendAudit } from '../auditLog'
import { emitLifeEvent } from '../lifeEventBus'
import { clamp01, lifeId, nowIso } from '../types'
import { extractExplicitDna, shouldBlockDnaValue } from './dnaExtractor'
import { loadDna, saveDna } from './dnaRepository'
import type { DnaRecord } from './dnaTypes'

export function listDna(opts?: { category?: string }): DnaRecord[] {
  const items = loadDna().filter((d) => !d.sensitive)
  if (opts?.category) return items.filter((d) => d.category === opts.category)
  return items
}

export function getDnaByKey(key: string): DnaRecord | null {
  return loadDna().find((d) => d.key === key) || null
}

/** Minimal DNA block for prompts — never dump entire store. */
export function dnaContextSnippet(max = 6): string {
  if (!hasConsent('dna')) return ''
  return listDna()
    .filter((d) => d.confidence >= 0.8)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, max)
    .map((d) => `${d.key}=${d.value}`)
    .join('; ')
}

export function rememberDnaFromText(text: string): { ok: boolean; message: string; record?: DnaRecord } {
  if (!hasConsent('dna')) {
    return { ok: false, message: 'DNA 기억 저장이 꺼져 있습니다. 설정에서 켤 수 있어요.' }
  }
  if (shouldBlockDnaValue(text)) {
    return { ok: false, message: '비밀번호·키·금융정보 등 민감정보는 DNA에 저장하지 않습니다.' }
  }
  const extracted = extractExplicitDna(text)
  if (!extracted) {
    return { ok: false, message: '저장할 명시적 선호를 찾지 못했어요. 예: 「나는 짧은 답변이 좋아」' }
  }
  const now = nowIso()
  const items = loadDna()
  const existing = items.find((d) => d.key === extracted.key)
  if (existing) {
    // Explicit statement wins over older inference
    if (extracted.confidence >= existing.confidence || existing.source === 'inference') {
      existing.value = extracted.value
      existing.confidence = clamp01(extracted.confidence)
      existing.source = 'explicit-user-statement'
      existing.updatedAt = now
      existing.lastUsedAt = now
      saveDna(items)
      emitLifeEvent('dna.changed', { id: existing.id })
      appendAudit('dna.update', existing.key)
      return { ok: true, message: `기억했어요: ${existing.key} = ${existing.value}`, record: existing }
    }
  }
  const rec: DnaRecord = {
    id: lifeId('dna'),
    category: extracted.category,
    key: extracted.key,
    value: extracted.value,
    source: 'explicit-user-statement',
    confidence: clamp01(extracted.confidence),
    importance: 0.8,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    userEditable: true,
    sensitive: false,
  }
  items.unshift(rec)
  saveDna(items)
  emitLifeEvent('dna.changed', { id: rec.id })
  appendAudit('dna.create', rec.key)
  return { ok: true, message: `기억했어요: ${rec.key} = ${rec.value}`, record: rec }
}

export function forgetDna(query: string): { ok: boolean; message: string } {
  const q = query.trim().toLowerCase()
  const items = loadDna()
  const next = items.filter(
    (d) =>
      !(
        d.key.toLowerCase() === q ||
        d.value.toLowerCase().includes(q) ||
        d.id === q ||
        /그\s*기억|이\s*기억|전부|모두/.test(q)
      ),
  )
  if (/전부|모두|다\s*지워|전체\s*삭제/.test(query)) {
    saveDna([])
    appendAudit('dna.clear', 'all')
    emitLifeEvent('dna.changed', { cleared: true })
    try {
      // AIE Learning — do not re-recommend cleared memories
      void import('../../aie').then((m) => m.recordForgottenMemory('dna_cleared_all')).catch(() => {})
    } catch {
      /* optional */
    }
    return { ok: true, message: 'DNA 기억을 모두 삭제했습니다.' }
  }
  if (next.length === items.length) {
    return { ok: false, message: '삭제할 기억을 찾지 못했어요.' }
  }
  saveDna(next)
  appendAudit('dna.delete', q)
  emitLifeEvent('dna.changed', {})
  try {
    void import('../../aie').then((m) => m.recordForgottenMemory(q)).catch(() => {})
  } catch {
    /* optional */
  }
  return { ok: true, message: '해당 기억을 삭제했습니다.' }
}

export function formatDnaList(): string {
  const items = listDna()
  if (!items.length) return '아직 저장된 DNA 선호가 없습니다.'
  return ['【AIZIO DNA】', ...items.slice(0, 20).map((d) => `• ${d.key}: ${d.value} (신뢰 ${d.confidence})`)].join(
    '\n',
  )
}
