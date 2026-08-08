/**
 * Small IndexedDB key-value store for durable offline data.
 * Does not replace all localStorage yet — dual-write / migrate hot keys safely.
 */

const DB_NAME = 'aizio-offline-kv-v1'
const STORE = 'kv'
const DB_VERSION = 1

export type IdbKvValue = string | number | boolean | null | object

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IDB open failed'))
  })
}

export async function idbGet<T = IdbKvValue>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return undefined
  }
}

export async function idbSet(key: string, value: IdbKvValue): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function idbDel(key: string): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

/** Mirror a localStorage string blob into IDB (best-effort, never throws). */
export async function mirrorLocalStorageKey(key: string): Promise<void> {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return
    await idbSet(`ls:${key}`, v)
  } catch {
    /* ignore */
  }
}

/** Restore from IDB into localStorage if LS missing (cold reinstall of SW cache only). */
export async function restoreLocalStorageKey(key: string): Promise<boolean> {
  try {
    if (localStorage.getItem(key) != null) return false
    const v = await idbGet<string>(`ls:${key}`)
    if (typeof v !== 'string') return false
    localStorage.setItem(key, v)
    return true
  } catch {
    return false
  }
}

/** Keys we dual-write so user data survives cache wipes (never wipe IDB with asset caches). */
export const DURABLE_LS_KEYS = [
  'aizio_family_helper_v1',
  'jarvis_settings_v1',
  'jarvis_chat_v1',
  'jarvis_reminders_v1',
  'aizio.offline.outbox.v1',
  'jarvis.geo.last.v1',
  'jarvis.geo.granted.v1',
] as const

export async function mirrorDurableLocalData(): Promise<number> {
  let n = 0
  for (const k of DURABLE_LS_KEYS) {
    try {
      if (localStorage.getItem(k) != null) {
        await mirrorLocalStorageKey(k)
        n++
      }
    } catch {
      /* ignore */
    }
  }
  return n
}

export async function restoreDurableLocalData(): Promise<number> {
  let n = 0
  for (const k of DURABLE_LS_KEYS) {
    if (await restoreLocalStorageKey(k)) n++
  }
  return n
}
