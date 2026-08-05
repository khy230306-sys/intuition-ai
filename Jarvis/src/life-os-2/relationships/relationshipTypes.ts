export type ExtendedRelationKind =
  | 'family'
  | 'friend'
  | 'coworker'
  | 'client'
  | 'acquaintance'
  | 'guardian'
  | 'teammate'
  | 'other'

export type ExtendedRelationship = {
  id: string
  name: string
  aliases: string[]
  kind: ExtendedRelationKind
  org: string
  notes: string
  relatedProjectNames: string[]
  importantDates: string[]
  lastInteractionAt: string | null
  shareScope: 'private'
  createdAt: string
  updatedAt: string
  /** Link to legacy jarvis_relationships_v1 id when known */
  legacyId: string | null
}
