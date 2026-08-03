/**
 * Optional per-user key namespace for future authenticated storage.
 * Guest mode continues to use legacy flat keys (jarvis_*, aizio_life_*).
 */

import { ensureGuestIdentity } from './guestAuth'
import type { UserIdentity } from './types'

export function namespacedKey(userId: string, baseKey: string): string {
  return `u:${userId}:${baseKey}`
}

export function resolveStorageKey(baseKey: string, identity?: UserIdentity): string {
  const id = identity || ensureGuestIdentity()
  if (id.mode === 'guest') return baseKey
  return namespacedKey(id.userId, baseKey)
}

/**
 * Read with fallback: namespaced first (authenticated), then legacy flat key.
 * Prevents data loss during migration.
 */
export function readUserJson<T>(baseKey: string, fallback: T, identity?: UserIdentity): T {
  const id = identity || ensureGuestIdentity()
  try {
    if (id.mode === 'authenticated') {
      const ns = localStorage.getItem(namespacedKey(id.userId, baseKey))
      if (ns) return JSON.parse(ns) as T
    }
    const legacy = localStorage.getItem(baseKey)
    if (legacy) return JSON.parse(legacy) as T
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeUserJson(baseKey: string, value: unknown, identity?: UserIdentity): void {
  const id = identity || ensureGuestIdentity()
  const key = resolveStorageKey(baseKey, id)
  localStorage.setItem(key, JSON.stringify(value))
}

/** Attach owner metadata to a record without breaking existing shapes. */
export function withOwner<T extends object>(record: T, identity?: UserIdentity): T & { ownerUserId: string } {
  const id = identity || ensureGuestIdentity()
  return { ...record, ownerUserId: id.userId }
}

export function assertSameOwner(ownerUserId: string | undefined, identity?: UserIdentity): boolean {
  if (!ownerUserId) return true
  const id = identity || ensureGuestIdentity()
  return ownerUserId === id.userId
}
