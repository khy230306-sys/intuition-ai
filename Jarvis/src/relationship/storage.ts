import type { RelationCode, RelationshipRecord } from './types'

const KEY = 'jarvis_relationships_v1'

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function read(): RelationshipRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as RelationshipRecord[]
  } catch {
    return []
  }
}

function write(items: RelationshipRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)))
}

export function loadRelationships(): RelationshipRecord[] {
  return read()
}

export function saveRelationships(items: RelationshipRecord[]): void {
  write(items)
}

export function upsertRelationship(input: {
  relationship: RelationCode
  displayRelation: string
  name: string | null
  aliases?: string[]
  confidence?: number
}): RelationshipRecord {
  const now = new Date().toISOString()
  const items = read()
  const nameNorm = input.name?.trim() || null
  let found =
    items.find((r) => r.relationship === input.relationship && (nameNorm ? r.name === nameNorm : true)) ||
    (nameNorm ? items.find((r) => r.name === nameNorm) : undefined) ||
    items.find((r) => r.relationship === input.relationship && !r.name)

  if (found) {
    found.name = nameNorm ?? found.name
    found.displayRelation = input.displayRelation || found.displayRelation
    found.aliases = Array.from(new Set([...(found.aliases || []), ...(input.aliases || []), input.displayRelation]))
    found.confidence = Math.max(found.confidence, input.confidence ?? 0.9)
    found.updatedAt = now
    write(items)
    return found
  }

  const rec: RelationshipRecord = {
    id: uid(),
    relationship: input.relationship,
    displayRelation: input.displayRelation,
    name: nameNorm,
    aliases: Array.from(new Set([...(input.aliases || []), input.displayRelation])),
    notes: [],
    source: 'conversation',
    confidence: input.confidence ?? 0.95,
    createdAt: now,
    updatedAt: now,
    userEditable: true,
  }
  items.unshift(rec)
  write(items)
  return rec
}

export function findRelationship(query: string): RelationshipRecord | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const items = read()
  return (
    items.find((r) => r.name && r.name.toLowerCase() === q) ||
    items.find((r) => r.displayRelation.toLowerCase() === q) ||
    items.find((r) => r.aliases.some((a) => a.toLowerCase() === q || q.includes(a.toLowerCase()))) ||
    items.find((r) => r.relationship === q) ||
    null
  )
}

export function findByRelationCode(code: RelationCode): RelationshipRecord | null {
  return read().find((r) => r.relationship === code) || null
}

export function deleteRelationship(id: string): boolean {
  const items = read()
  const next = items.filter((r) => r.id !== id)
  if (next.length === items.length) return false
  write(next)
  return true
}

export function deleteRelationshipByQuery(query: string): RelationshipRecord | null {
  const hit = findRelationship(query)
  if (!hit) return null
  deleteRelationship(hit.id)
  return hit
}
