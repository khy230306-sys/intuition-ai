import { openDB, type IDBPDatabase } from 'idb'
import type { AppDataSnapshot } from '@/types'
import { createDemoSnapshot } from '@/data/demo'

const DB_NAME = 'poker-director'
const DB_VERSION = 1
const STORE = 'app'
const KEY = 'snapshot'
export const SNAPSHOT_LS_KEY = 'poker-director-snapshot-v1'
const LS_KEY = SNAPSHOT_LS_KEY

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

export async function loadSnapshot(): Promise<AppDataSnapshot> {
  try {
    const db = await getDb()
    const fromIdb = (await db.get(STORE, KEY)) as AppDataSnapshot | undefined
    if (fromIdb?.version) return fromIdb
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppDataSnapshot
      if (parsed?.version) return parsed
    }
  } catch {
    // fall through
  }
  const demo = createDemoSnapshot()
  await saveSnapshot(demo)
  return demo
}

export async function saveSnapshot(snapshot: AppDataSnapshot): Promise<void> {
  const payload = { ...snapshot, version: snapshot.version || 1 }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota
  }
  try {
    const db = await getDb()
    await db.put(STORE, payload, KEY)
  } catch {
    // IndexedDB may be unavailable in private mode
  }
}

export async function resetToDemo(): Promise<AppDataSnapshot> {
  const demo = createDemoSnapshot()
  await saveSnapshot(demo)
  return demo
}

export function exportSnapshotJson(snapshot: AppDataSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

export function importSnapshotJson(text: string): AppDataSnapshot {
  const parsed = JSON.parse(text) as AppDataSnapshot
  if (!parsed || typeof parsed !== 'object' || !parsed.version) {
    throw new Error('유효하지 않은 백업 파일입니다.')
  }
  return parsed
}
