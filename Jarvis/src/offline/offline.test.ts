import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  enqueueOutbox,
  flushOutbox,
  listOutbox,
  pendingOutboxCount,
  clearAllOutbox,
  updateOutboxStatus,
} from './outbox'
import { netStatusLabelKo, onlineOnlyMessage, probeNetwork } from './networkStatus'
import { langPackStatusLabel, listLanguagePacks } from './langPacks'
import { formatBytes, readShellReadyFlag } from './shellReady'
import { renderOfflineBadge, renderOfflineStrip, renderOfflineSettingsPanel } from './offlineUi'

const mem = new Map<string, string>()

describe('offline outbox', () => {
  beforeEach(() => {
    mem.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
      clear: () => mem.clear(),
      get length() {
        return mem.size
      },
      key: (i: number) => [...mem.keys()][i] ?? null,
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('enqueues with idempotency (no duplicate pending)', () => {
    const a = enqueueOutbox({ entityType: 'todo', entityId: 't1', action: 'create', payload: { title: 'A' } })
    const b = enqueueOutbox({ entityType: 'todo', entityId: 't1', action: 'create', payload: { title: 'B' } })
    expect(a.operationId).toBe(b.operationId)
    expect(listOutbox()).toHaveLength(1)
    expect(pendingOutboxCount()).toBe(1)
  })

  it('flushes pending local entities when online', async () => {
    enqueueOutbox({ entityType: 'note', entityId: 'n1', action: 'upsert' })
    const r = await flushOutbox({ isOnline: () => true })
    expect(r.synced).toBe(1)
    expect(pendingOutboxCount()).toBe(0)
  })

  it('does not flush when offline', async () => {
    enqueueOutbox({ entityType: 'calendar', entityId: 'c1', action: 'create' })
    const r = await flushOutbox({ isOnline: () => false })
    expect(r.synced).toBe(0)
    expect(pendingOutboxCount()).toBe(1)
  })

  it('tracks failed retries', () => {
    const item = enqueueOutbox({ entityType: 'generic', entityId: 'g1', action: 'update' })
    updateOutboxStatus(item.operationId, 'failed', 'boom')
    expect(listOutbox()[0].retryCount).toBe(1)
    clearAllOutbox()
    expect(listOutbox()).toHaveLength(0)
  })
})

describe('offline network + UI', () => {
  it('labels and online-only messages', () => {
    expect(netStatusLabelKo('offline')).toBe('오프라인')
    expect(netStatusLabelKo('online')).toBe('온라인')
    expect(onlineOnlyMessage('weather')).toMatch(/오프라인/)
  })

  it('probeNetwork marks offline when navigator.onLine is false', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(probeNetwork({ force: true })).resolves.toBe('offline')
    vi.unstubAllGlobals()
  })

  it('lists language packs without inventing a neural engine', () => {
    const packs = listLanguagePacks()
    expect(packs.some((p) => p.status === 'installed-builtin')).toBe(true)
    expect(packs.some((p) => p.status === 'engine-pending')).toBe(true)
    expect(langPackStatusLabel('engine-pending')).toMatch(/엔진/)
  })

  it('renders offline badge and strip', () => {
    expect(renderOfflineBadge('offline')).toContain('오프라인')
    expect(renderOfflineStrip('online')).toBe('')
    expect(renderOfflineStrip('offline')).toContain('오프라인 모드')
    expect(renderOfflineStrip('offline')).toContain('data-offline-strip')
  })

  it('settings panel only claims ready when report says so', () => {
    const html = renderOfflineSettingsPanel({
      appVersion: '1.21.0',
      netStatus: 'offline',
      shell: {
        ready: false,
        controlled: false,
        swReady: false,
        hasIndex: false,
        cacheNames: [],
        lastCheckedAt: new Date().toISOString(),
        appVersion: '1.21.0',
        detail: '미완료',
      },
      storageBytes: 2048,
    })
    expect(html).toContain('오프라인 사용')
    expect(html).toContain('미완료')
    expect(html).toContain(formatBytes(2048))
    expect(readShellReadyFlag().ready).toBe(false)
  })
})
