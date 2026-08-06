/**
 * Offline outbox — queue mutations while offline; sync when network returns.
 * Idempotent keys prevent duplicate creates on retry.
 */

export type OutboxSyncStatus = 'local-only' | 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'

export type OutboxEntityType =
  | 'calendar'
  | 'todo'
  | 'note'
  | 'reminder'
  | 'settings'
  | 'translate-cache'
  | 'generic'

export type OutboxAction = 'create' | 'update' | 'delete' | 'upsert'

export type OutboxItem = {
  operationId: string
  entityType: OutboxEntityType
  entityId: string
  action: OutboxAction
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
  lastError: string | null
  syncStatus: OutboxSyncStatus
  idempotencyKey: string
}

const STORAGE_KEY = 'aizio.offline.outbox.v1'
const MAX_ITEMS = 200

function rid(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readAll(): OutboxItem[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as OutboxItem[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeAll(items: OutboxItem[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)))
  } catch {
    /* quota */
  }
}

export function listOutbox(filter?: { syncStatus?: OutboxSyncStatus }): OutboxItem[] {
  const all = readAll()
  if (!filter?.syncStatus) return all
  return all.filter((x) => x.syncStatus === filter.syncStatus)
}

export function pendingOutboxCount(): number {
  return readAll().filter((x) => x.syncStatus === 'pending' || x.syncStatus === 'failed').length
}

export function enqueueOutbox(input: {
  entityType: OutboxEntityType
  entityId: string
  action: OutboxAction
  payload?: Record<string, unknown>
  idempotencyKey?: string
  syncStatus?: OutboxSyncStatus
}): OutboxItem {
  const idempotencyKey =
    input.idempotencyKey || `${input.entityType}:${input.entityId}:${input.action}`
  const items = readAll()
  const existing = items.find(
    (x) =>
      x.idempotencyKey === idempotencyKey &&
      (x.syncStatus === 'pending' || x.syncStatus === 'syncing' || x.syncStatus === 'local-only'),
  )
  if (existing) {
    existing.payload = input.payload || existing.payload
    existing.createdAt = Date.now()
    writeAll(items)
    return existing
  }
  const item: OutboxItem = {
    operationId: rid(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    payload: input.payload || {},
    createdAt: Date.now(),
    retryCount: 0,
    lastError: null,
    syncStatus: input.syncStatus || 'pending',
    idempotencyKey,
  }
  items.push(item)
  writeAll(items)
  return item
}

export function updateOutboxStatus(
  operationId: string,
  syncStatus: OutboxSyncStatus,
  lastError?: string | null,
): void {
  const items = readAll()
  const hit = items.find((x) => x.operationId === operationId)
  if (!hit) return
  hit.syncStatus = syncStatus
  if (lastError !== undefined) hit.lastError = lastError
  if (syncStatus === 'failed') hit.retryCount += 1
  writeAll(items)
}

export function clearSyncedOutbox(): number {
  const before = readAll()
  const next = before.filter((x) => x.syncStatus !== 'synced')
  writeAll(next)
  return before.length - next.length
}

export function clearAllOutbox(): void {
  writeAll([])
}

/**
 * Flush pending items. Local-first entities (calendar/todo/note) are already on-device —
 * mark synced when online so the queue drains. Remote sync hooks can replace this later.
 */
export async function flushOutbox(opts?: {
  isOnline?: () => boolean
  onConflict?: (item: OutboxItem) => 'keep-local' | 'keep-remote' | 'skip'
}): Promise<{ synced: number; failed: number; skipped: number }> {
  const online = opts?.isOnline ? opts.isOnline() : typeof navigator !== 'undefined' ? navigator.onLine : true
  if (!online) return { synced: 0, failed: 0, skipped: 0 }
  const items = readAll().filter((x) => x.syncStatus === 'pending' || x.syncStatus === 'failed')
  let synced = 0
  let failed = 0
  let skipped = 0
  for (const item of items) {
    updateOutboxStatus(item.operationId, 'syncing')
    try {
      // Local-only entities: persistence already happened in app stores.
      if (
        item.entityType === 'calendar' ||
        item.entityType === 'todo' ||
        item.entityType === 'note' ||
        item.entityType === 'settings' ||
        item.entityType === 'translate-cache' ||
        item.entityType === 'reminder' ||
        item.entityType === 'generic'
      ) {
        updateOutboxStatus(item.operationId, 'synced', null)
        synced += 1
        continue
      }
      skipped += 1
      updateOutboxStatus(item.operationId, 'pending')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'sync failed'
      updateOutboxStatus(item.operationId, 'failed', msg.slice(0, 160))
      failed += 1
    }
  }
  clearSyncedOutbox()
  return { synced, failed, skipped }
}
