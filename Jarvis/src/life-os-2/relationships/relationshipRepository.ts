import { loadItems, saveItems, LOS2_KEYS, los2Id, nowIso } from '../repository'
import type { ExtendedRelationship, ExtendedRelationKind } from './relationshipTypes'

export function loadExtendedRelationships(): ExtendedRelationship[] {
  return loadItems<ExtendedRelationship>(LOS2_KEYS.relationships)
}

export function saveExtendedRelationships(items: ExtendedRelationship[]): void {
  saveItems(LOS2_KEYS.relationships, items, 120)
}

export function upsertExtended(input: {
  name: string
  kind: ExtendedRelationKind
  org?: string
  notes?: string
  relatedProjectNames?: string[]
}): ExtendedRelationship {
  const items = loadExtendedRelationships()
  const name = input.name.trim().slice(0, 40)
  const existing = items.find((r) => r.name === name)
  const now = nowIso()
  if (existing) {
    existing.kind = input.kind || existing.kind
    if (input.org) existing.org = input.org.slice(0, 60)
    if (input.notes) existing.notes = input.notes.slice(0, 200)
    if (input.relatedProjectNames) existing.relatedProjectNames = input.relatedProjectNames
    existing.updatedAt = now
    existing.lastInteractionAt = now
    saveExtendedRelationships(items)
    return existing
  }
  const rec: ExtendedRelationship = {
    id: los2Id('xrel'),
    name,
    aliases: [],
    kind: input.kind,
    org: (input.org || '').slice(0, 60),
    notes: (input.notes || '').slice(0, 200),
    relatedProjectNames: input.relatedProjectNames || [],
    importantDates: [],
    lastInteractionAt: now,
    shareScope: 'private',
    createdAt: now,
    updatedAt: now,
    legacyId: null,
  }
  items.unshift(rec)
  saveExtendedRelationships(items)
  return rec
}

export function findExtended(query: string): ExtendedRelationship | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  return (
    loadExtendedRelationships().find(
      (r) => r.name.toLowerCase() === q || r.aliases.some((a) => a.toLowerCase() === q) || r.name.toLowerCase().includes(q),
    ) || null
  )
}
