import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetGuestIdentityForTests } from '../account'
import {
  BACKUP_SCHEMA_VERSION,
  exportBackupJson,
  importBackupJson,
  previewBackup,
} from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => 'backup-user-1' })

beforeEach(() => {
  store.clear()
  resetGuestIdentityForTests()
})

describe('backup v8', () => {
  it('exports relationships, smart reminders, life os without api keys', () => {
    store.set('jarvis_chat_v1', JSON.stringify([{ id: '1', role: 'user', text: 'hi', createdAt: 1 }]))
    store.set('jarvis_relationships_v1', JSON.stringify([{ id: 'r1', label: '엄마', name: '김영희' }]))
    store.set('jarvis_smart_reminders_v1', JSON.stringify([{ id: 's1', title: '병원' }]))
    store.set('aizio_life_dna_v1', JSON.stringify({ version: 1, items: [{ key: 'hobby', value: '낚시' }] }))
    store.set(
      'jarvis_settings_v1',
      JSON.stringify({ displayName: '테스터', apiKey: 'sk-SECRETKEY123456', apiBase: 'x', model: 'y', city: '서울' }),
    )
    store.set(
      'jarvis_hybrid_ai_v1',
      JSON.stringify({ mode: 'auto', providers: { openrouter: { apiKey: 'sk-or-secret', enabled: true } } }),
    )

    const json = exportBackupJson()
    expect(json).not.toContain('sk-SECRETKEY')
    expect(json).not.toContain('sk-or-secret')
    const data = JSON.parse(json) as Record<string, unknown>
    expect(data.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
    expect(data.cloudSync).toBe(false)
    expect(data.relationships).toBeTruthy()
    expect(data.smartReminders).toBeTruthy()
    expect(data.lifeOs).toBeTruthy()
    expect((data.settings as { apiKey?: string }).apiKey).toBe('')
  })

  it('previews and rejects corrupt files', () => {
    const bad = previewBackup('{not json')
    expect(bad.schemaVersion).toBe(0)
    expect(bad.warnings[0]).toMatch(/파싱|손상/)
  })

  it('round-trips selective categories', () => {
    store.set('jarvis_relationships_v1', JSON.stringify([{ id: 'r1', name: '김영희' }]))
    store.set('aizio_life_goals_v1', JSON.stringify({ version: 1, items: [{ id: 'g1', title: '출시' }] }))
    const json = exportBackupJson({ categories: ['relationships', 'lifeOs', 'account'] })
    store.clear()
    resetGuestIdentityForTests()
    const result = importBackupJson(json, { categories: ['relationships', 'lifeOs'] })
    expect(result.ok).toBe(true)
    expect(store.get('jarvis_relationships_v1')).toMatch(/김영희/)
    expect(store.get('aizio_life_goals_v1')).toMatch(/출시/)
  })

  it('imports legacy v6 shape', () => {
    const v6 = JSON.stringify({
      version: 6,
      chat: [{ id: 'c1', role: 'user', text: '안녕', createdAt: 1 }],
      settings: { displayName: '레거시', apiKey: 'sk-should-not-apply', city: '부산' },
    })
    const r = importBackupJson(v6)
    expect(r.ok).toBe(true)
    expect(store.get('jarvis_chat_v1')).toMatch(/안녕/)
    const settings = JSON.parse(store.get('jarvis_settings_v1') || '{}') as { apiKey?: string; displayName?: string }
    expect(settings.apiKey).not.toBe('sk-should-not-apply')
    expect(settings.displayName).toBe('레거시')
  })
})
