import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleRelationshipText, parseRelationshipUtterance, loadRelationships } from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => `id-${Math.random().toString(16).slice(2)}` })

describe('AIZIO Relationship Memory', () => {
  beforeEach(() => store.clear())

  it('parses mother name', () => {
    const p = parseRelationshipUtterance('우리 엄마 이름은 김영희야.')
    expect(p?.kind).toBe('remember')
    if (p && (p.kind === 'remember' || p.kind === 'update')) {
      expect(p.relationship).toBe('mother')
      expect(p.name).toBe('김영희')
    }
  })

  it('parses name-then-relation', () => {
    const p = parseRelationshipUtterance('김철수는 내 아빠야.')
    expect(p?.kind).toBe('remember')
    if (p && p.kind === 'remember') {
      expect(p.relationship).toBe('father')
      expect(p.name).toBe('김철수')
    }
  })

  it('stores and recalls', () => {
    const a = handleRelationshipText('우리 엄마 이름은 김영희야.')
    expect(a?.text).toMatch(/김영희.*어머니|엄마/)
    expect(loadRelationships()[0]?.name).toBe('김영희')
    const b = handleRelationshipText('엄마 이름 뭐였지?')
    expect(b?.text).toMatch(/김영희/)
  })

  it('lists and deletes', () => {
    handleRelationshipText('한영이는 내 아들이야.')
    const list = handleRelationshipText('가족 관계 목록')
    expect(list?.text).toMatch(/아들|한영/)
    const del = handleRelationshipText('아들 기억에서 지워줘')
    expect(del?.text).toMatch(/삭제/)
    expect(loadRelationships().length).toBe(0)
  })
})
