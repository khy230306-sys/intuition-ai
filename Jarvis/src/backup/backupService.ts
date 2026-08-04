/**
 * Backup v7 — category export/import, schema check, secrets stripped.
 * Uses localStorage directly to avoid circular imports with storage.ts.
 * Does not claim cloud device restore without server sync.
 */

import { ensureGuestIdentity } from '../account'
import { stripSecretsFromObject } from '../life-os/privacyPolicy'
import {
  ALL_BACKUP_CATEGORIES,
  BACKUP_SCHEMA_VERSION,
  type BackupBuildOptions,
  type BackupCategory,
  type BackupImportResult,
  type BackupPreview,
} from './backupTypes'

const K = {
  chat: 'jarvis_chat_v1',
  memory: 'jarvis_memory_v1',
  reminders: 'jarvis_reminders_v1',
  shopping: 'jarvis_shopping_v1',
  expenses: 'jarvis_expenses_v1',
  habits: 'jarvis_habits_v1',
  journal: 'jarvis_journal_v1',
  profile: 'jarvis_profile_v1',
  watchlist: 'jarvis_watchlist_v1',
  holdings: 'jarvis_holdings_v1',
  trades: 'jarvis_trades_v1',
  series: 'jarvis_series_v1',
  activeSeries: 'jarvis_active_series_v1',
  settings: 'jarvis_settings_v1',
  family: 'jarvis_family_room_v1',
  friends: 'jarvis_friends_room_v1',
  relationships: 'jarvis_relationships_v1',
  customers: 'jarvis_customers_v1',
  smartReminders: 'jarvis_smart_reminders_v1',
  smartReminderCtx: 'jarvis_smart_reminder_ctx_v1',
  localAlarms: 'jarvis_local_alarms_v1',
  arcadeBest: 'jarvis.arcade.best.v1',
  arcadeBestLevel: 'jarvis.arcade.bestLevel.v1',
  reminderPush: 'aizio.push.reminderSubscription.v1',
  identity: 'aizio_user_identity_v1',
} as const

const LIFE_OS_KEYS = [
  'aizio_life_dna_v1',
  'aizio_life_goals_v1',
  'aizio_life_projects_v1',
  'aizio_life_ideas_v1',
  'aizio_life_meetings_v1',
  'aizio_life_timeline_v1',
  'aizio_life_routines_v1',
  'aizio_life_family_space_v1',
  'aizio_life_health_v1',
  'aizio_life_finance_v1',
  'aizio_life_travel_v1',
  'aizio_life_learning_v1',
  'aizio_life_consent_v1',
  'aizio_life_flags_v1',
  'aizio_life_schema_v1',
] as const

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function exportHybridAiMetaSafe(): unknown {
  try {
    const raw = localStorage.getItem('jarvis_hybrid_ai_v1')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      mode?: string
      fixedProvider?: string
      allowPaidFallback?: boolean
      wizardDismissed?: boolean
      providers?: Record<string, { apiKey?: string; apiKeyEnc?: string; model?: string; enabled?: boolean }>
    }
    const providers: Record<string, { hasKey: boolean; model?: string; enabled?: boolean }> = {}
    for (const [id, slot] of Object.entries(parsed.providers || {})) {
      providers[id] = {
        hasKey: Boolean(slot.apiKeyEnc || slot.apiKey),
        model: slot.model,
        enabled: slot.enabled,
      }
    }
    return {
      mode: parsed.mode,
      fixedProvider: parsed.fixedProvider,
      allowPaidFallback: parsed.allowPaidFallback === true,
      wizardDismissed: parsed.wizardDismissed === true,
      providers,
    }
  } catch {
    return null
  }
}

function collectLifeOs(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of LIFE_OS_KEYS) {
    const v = readRaw(k)
    if (v != null) out[k] = stripSecretsFromObject(v)
  }
  return out
}

function countArray(v: unknown): number {
  return Array.isArray(v) ? v.length : v == null ? 0 : 1
}

export function buildBackupObject(opts: BackupBuildOptions = {}): Record<string, unknown> {
  const cats = new Set(opts.categories?.length ? opts.categories : ALL_BACKUP_CATEGORIES)
  const identity = ensureGuestIdentity()
  const body: Record<string, unknown> = {
    version: BACKUP_SCHEMA_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'AIZIO',
    ownerUserId: identity.userId,
    deviceId: identity.deviceId,
    categories: Array.from(cats),
    secretsPolicy: 'api keys and tokens excluded',
    cloudSync: false,
  }

  if (cats.has('chat')) body.chat = readRaw(K.chat) ?? []
  if (cats.has('life')) {
    body.memory = readRaw(K.memory) ?? []
    body.reminders = readRaw(K.reminders) ?? []
    body.shopping = readRaw(K.shopping) ?? []
    body.expenses = readRaw(K.expenses) ?? []
    body.habits = readRaw(K.habits) ?? []
    body.journal = readRaw(K.journal) ?? []
    body.profile = readRaw(K.profile)
  }
  if (cats.has('invest')) {
    body.watchlist = readRaw(K.watchlist) ?? []
    body.holdings = readRaw(K.holdings) ?? []
    body.trades = readRaw(K.trades) ?? []
    body.series = readRaw(K.series) ?? []
    body.activeSeries = readRaw(K.activeSeries)
  }
  if (cats.has('familyFriends')) {
    body.family = readRaw(K.family)
    body.friends = readRaw(K.friends)
  }
  if (cats.has('relationships')) body.relationships = readRaw(K.relationships)
  if (cats.has('customers')) body.customers = readRaw(K.customers) ?? []
  if (cats.has('smartReminders')) {
    body.smartReminders = readRaw(K.smartReminders)
    body.smartReminderCtx = readRaw(K.smartReminderCtx)
    body.localAlarms = readRaw(K.localAlarms)
  }
  if (cats.has('lifeOs')) body.lifeOs = collectLifeOs()
  if (cats.has('account')) {
    body.account = {
      identity: { ...identity, linkedAccountId: identity.linkedAccountId ?? null },
      reminderPush: readRaw(K.reminderPush),
    }
  }
  if (cats.has('settings')) {
    const settings = (readRaw(K.settings) as Record<string, unknown> | null) || {}
    body.settings = { ...settings, apiKey: '' }
    body.hybridAi = exportHybridAiMetaSafe()
  }
  if (cats.has('arcade')) {
    body.arcadeBest = readRaw(K.arcadeBest)
    body.arcadeBestLevel = readRaw(K.arcadeBestLevel)
  }

  return body
}

export function exportBackupJson(opts?: BackupBuildOptions): string {
  return JSON.stringify(buildBackupObject(opts), null, 2)
}

export function previewBackup(json: string): BackupPreview {
  const warnings: string[] = []
  let data: Record<string, unknown>
  try {
    data = JSON.parse(json) as Record<string, unknown>
  } catch {
    return {
      schemaVersion: 0,
      categories: [],
      counts: {},
      hasSecretsBlocked: true,
      warnings: ['JSON 파싱 실패 — 손상된 파일로 차단합니다.'],
    }
  }

  const version = Number(data.schemaVersion ?? data.version ?? 0)
  if (!Number.isFinite(version) || version < 1 || version > BACKUP_SCHEMA_VERSION + 2) {
    warnings.push(`알 수 없는 스키마 버전: ${String(data.version)}`)
  }
  if (data.cloudSync === true) {
    warnings.push('cloudSync=true 표시가 있어도 이 클라이언트는 서버 복원을 수행하지 않습니다.')
  }

  const categories = (Array.isArray(data.categories) ? data.categories : ALL_BACKUP_CATEGORIES) as BackupCategory[]
  const counts: Record<string, number> = {
    chat: countArray(data.chat),
    memory: countArray(data.memory),
    reminders: countArray(data.reminders),
    relationships: countArray(data.relationships),
    customers: countArray(data.customers),
    smartReminders: countArray(data.smartReminders),
    lifeOsKeys: data.lifeOs && typeof data.lifeOs === 'object' ? Object.keys(data.lifeOs as object).length : 0,
  }

  const blob = JSON.stringify(data)
  if (/sk-[a-zA-Z0-9]{10,}/.test(blob) || /"apiKey"\s*:\s*"[^"]{8,}"/.test(blob)) {
    warnings.push('파일에 API 키로 보이는 문자열이 있습니다. 가져오기 시 키는 적용하지 않습니다.')
  }

  return {
    schemaVersion: version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
    categories,
    counts,
    hasSecretsBlocked: true,
    warnings,
  }
}

export function importBackupJson(
  json: string,
  opts: { categories?: BackupCategory[] } = {},
): BackupImportResult {
  const preview = previewBackup(json)
  if (preview.schemaVersion === 0 && preview.warnings.some((w) => w.includes('파싱'))) {
    return { ok: false, message: '백업 파일이 손상되었거나 JSON이 아닙니다.', imported: [], skipped: ['*'] }
  }
  if (preview.schemaVersion > BACKUP_SCHEMA_VERSION + 2) {
    return {
      ok: false,
      message: `지원하지 않는 백업 버전(${preview.schemaVersion})입니다.`,
      imported: [],
      skipped: ['*'],
    }
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(json) as Record<string, unknown>
  } catch {
    return { ok: false, message: '백업 파일이 올바르지 않습니다.', imported: [], skipped: ['*'] }
  }

  const want = new Set(opts.categories?.length ? opts.categories : ALL_BACKUP_CATEGORIES)
  const imported: BackupCategory[] = []
  const skipped: string[] = []

  try {
    if (want.has('chat') && data.chat) {
      writeRaw(K.chat, data.chat)
      imported.push('chat')
    }
    if (want.has('life')) {
      if (data.memory) writeRaw(K.memory, data.memory)
      if (data.reminders) writeRaw(K.reminders, data.reminders)
      if (data.shopping) writeRaw(K.shopping, data.shopping)
      if (data.expenses) writeRaw(K.expenses, data.expenses)
      if (data.habits) writeRaw(K.habits, data.habits)
      if (data.journal) writeRaw(K.journal, data.journal)
      if (data.profile) {
        const cur = (readRaw(K.profile) as object) || {}
        writeRaw(K.profile, { ...cur, ...(data.profile as object) })
      }
      imported.push('life')
    }
    if (want.has('invest')) {
      if (data.watchlist) writeRaw(K.watchlist, data.watchlist)
      if (data.holdings) writeRaw(K.holdings, data.holdings)
      if (data.trades) writeRaw(K.trades, data.trades)
      if (data.series) writeRaw(K.series, data.series)
      if (data.activeSeries != null) writeRaw(K.activeSeries, data.activeSeries)
      imported.push('invest')
    }
    if (want.has('familyFriends')) {
      if (data.family) writeRaw(K.family, data.family)
      if (data.friends) writeRaw(K.friends, data.friends)
      imported.push('familyFriends')
    }
    if (want.has('relationships') && data.relationships != null) {
      writeRaw(K.relationships, data.relationships)
      imported.push('relationships')
    } else if (want.has('relationships')) skipped.push('relationships')
    if (want.has('customers') && data.customers != null) {
      writeRaw(K.customers, data.customers)
      imported.push('customers')
    } else if (want.has('customers')) skipped.push('customers')
    if (want.has('smartReminders')) {
      if (data.smartReminders != null) writeRaw(K.smartReminders, data.smartReminders)
      if (data.smartReminderCtx != null) writeRaw(K.smartReminderCtx, data.smartReminderCtx)
      if (data.localAlarms != null) writeRaw(K.localAlarms, data.localAlarms)
      imported.push('smartReminders')
    }
    if (want.has('lifeOs') && data.lifeOs && typeof data.lifeOs === 'object') {
      for (const [k, v] of Object.entries(data.lifeOs as Record<string, unknown>)) {
        if (!(LIFE_OS_KEYS as readonly string[]).includes(k)) continue
        writeRaw(k, stripSecretsFromObject(v))
      }
      imported.push('lifeOs')
    }
    if (want.has('account') && data.account && typeof data.account === 'object') {
      const acc = data.account as { reminderPush?: unknown }
      if (acc.reminderPush != null) writeRaw(K.reminderPush, acc.reminderPush)
      imported.push('account')
    }
    if (want.has('settings') && data.settings && typeof data.settings === 'object') {
      const current = (readRaw(K.settings) as Record<string, unknown>) || {}
      const incoming = { ...(data.settings as Record<string, unknown>) }
      delete incoming.apiKey
      writeRaw(K.settings, { ...current, ...incoming, apiKey: current.apiKey || '' })
      imported.push('settings')
    }
    if (want.has('arcade')) {
      if (data.arcadeBest != null) writeRaw(K.arcadeBest, data.arcadeBest)
      if (data.arcadeBestLevel != null) writeRaw(K.arcadeBestLevel, data.arcadeBestLevel)
      imported.push('arcade')
    }
    if (data.hybridAi) skipped.push('hybridAi-secrets')

    return {
      ok: true,
      message: `백업을 가져왔습니다. (${imported.join(', ') || '변경 없음'})`,
      imported,
      skipped,
    }
  } catch {
    return { ok: false, message: '백업 적용 중 오류가 났습니다.', imported, skipped: ['error'] }
  }
}
