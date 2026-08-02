/** Collapse duplicate roster entries that share the same display name. */

export type SpaceMemberLike = {
  id: string
  name: string
  joinedAt: number
  push?: unknown
}

function nameKey(name: string, fallbackId: string): string {
  const n = name.trim().toLowerCase()
  return n || fallbackId
}

/**
 * Keep one member per display name.
 * Prefer: local self id → entry with push → earlier joinedAt.
 */
export function dedupeMembersByName<T extends SpaceMemberLike>(
  members: T[],
  preferId?: string,
): T[] {
  const byName = new Map<string, T>()
  for (const m of members) {
    const key = nameKey(m.name, m.id)
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, m)
      continue
    }

    const joinedAt = Math.min(prev.joinedAt || m.joinedAt, m.joinedAt || prev.joinedAt)
    const push = m.push != null ? m.push : prev.push
    const name = (m.name || prev.name).trim() || prev.name

    if (preferId && m.id === preferId) {
      byName.set(key, { ...m, name, joinedAt, push })
      continue
    }
    if (preferId && prev.id === preferId) {
      byName.set(key, { ...prev, name, joinedAt, push })
      continue
    }

    const prevPush = prev.push != null
    const nextPush = m.push != null
    if (nextPush && !prevPush) {
      byName.set(key, { ...m, name, joinedAt, push })
      continue
    }
    if (prevPush && !nextPush) {
      byName.set(key, { ...prev, name, joinedAt, push })
      continue
    }

    if ((m.joinedAt || Number.POSITIVE_INFINITY) < (prev.joinedAt || Number.POSITIVE_INFINITY)) {
      byName.set(key, { ...m, name, joinedAt, push })
    } else {
      byName.set(key, { ...prev, name, joinedAt, push })
    }
  }
  return [...byName.values()]
}

/** Unique display names for header lists (order preserved). */
export function uniqueMemberNames(members: Array<{ name: string }>, fallback = ''): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of members) {
    const name = m.name.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  if (!out.length && fallback.trim()) out.push(fallback.trim())
  return out
}
