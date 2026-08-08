/** Installed pack registry (metadata only — weights live in transformers.js browser cache). */

import { allPacks, packById, type ModelPackDef } from './modelRegistry'

const STATE_KEY = 'aizio.anywhere.packs.v1'
const READY_KEY = 'aizio.anywhere.shellReadyAt.v1'
const ANYWHERE_READY_KEY = 'aizio.anywhere.offlineReady.v1'

export type PackInstallState = {
  id: string
  status: 'not_installed' | 'downloading' | 'installed' | 'corrupt' | 'error'
  progress: number
  bytesTotal?: number
  error?: string
  installedAt?: string
  lastUsedAt?: string
}

export type AnywherePackStore = {
  packs: Record<string, PackInstallState>
  activeChatPackId: string
  updatedAt: string
}

function emptyStore(): AnywherePackStore {
  return {
    packs: {},
    activeChatPackId: 'chat-smollm2-135m',
    updatedAt: new Date().toISOString(),
  }
}

export function loadPackStore(): AnywherePackStore {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as AnywherePackStore
    if (!parsed.packs) return emptyStore()
    return parsed
  } catch {
    return emptyStore()
  }
}

export function savePackStore(store: AnywherePackStore): void {
  store.updatedAt = new Date().toISOString()
  localStorage.setItem(STATE_KEY, JSON.stringify(store))
}

export function getPackState(id: string): PackInstallState {
  const s = loadPackStore()
  return (
    s.packs[id] || {
      id,
      status: 'not_installed',
      progress: 0,
    }
  )
}

export function setPackState(partial: PackInstallState): void {
  const s = loadPackStore()
  s.packs[partial.id] = partial
  savePackStore(s)
}

export function listPackStatuses(): Array<ModelPackDef & { state: PackInstallState }> {
  return allPacks().map((p) => ({ ...p, state: getPackState(p.id) }))
}

export function isChatModelInstalled(): boolean {
  const s = loadPackStore()
  const id = s.activeChatPackId
  return getPackState(id).status === 'installed' || getPackState('chat-smollm2-135m').status === 'installed'
}

export function installedTranslatePackIds(): string[] {
  return TRANSLATE_IDS.filter((id) => getPackState(id).status === 'installed')
}

const TRANSLATE_IDS = ['mt-ko-en', 'mt-en-ko', 'mt-en-vi', 'mt-en-ja', 'mt-en-zh']

export function markAnywhereOfflineReady(ready: boolean): void {
  try {
    if (ready) {
      localStorage.setItem(ANYWHERE_READY_KEY, '1')
      localStorage.setItem(READY_KEY, new Date().toISOString())
    } else {
      localStorage.setItem(ANYWHERE_READY_KEY, '0')
    }
  } catch {
    /* ignore */
  }
}

export function isAnywhereOfflineReady(): boolean {
  try {
    return localStorage.getItem(ANYWHERE_READY_KEY) === '1'
  } catch {
    return false
  }
}

export function anywhereReadyAt(): string | null {
  try {
    return localStorage.getItem(READY_KEY)
  } catch {
    return null
  }
}

export function activeChatPack(): ModelPackDef {
  const s = loadPackStore()
  return packById(s.activeChatPackId) || packById('chat-smollm2-135m')!
}

export function estimateInstalledMb(): number {
  let mb = 0
  for (const p of listPackStatuses()) {
    if (p.state.status === 'installed') mb += p.sizeMb
  }
  return mb
}
