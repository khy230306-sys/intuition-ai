/** AIZIO Relationship Memory — structured family/friend links from conversation. */

export type RelationCode =
  | 'mother'
  | 'father'
  | 'spouse'
  | 'son'
  | 'daughter'
  | 'elder_brother'
  | 'elder_sister'
  | 'younger_sibling'
  | 'grandmother'
  | 'grandfather'
  | 'aunt'
  | 'uncle'
  | 'friend'
  | 'guardian'
  | 'other'

export type RelationshipRecord = {
  id: string
  relationship: RelationCode
  displayRelation: string
  name: string | null
  aliases: string[]
  notes: string[]
  source: 'conversation'
  confidence: number
  createdAt: string
  updatedAt: string
  userEditable: true
}

export type RelationshipParse =
  | {
      kind: 'remember' | 'update'
      relationship: RelationCode
      displayRelation: string
      name: string | null
      aliases: string[]
    }
  | { kind: 'forget'; relationship?: RelationCode; name?: string; query: string }
  | { kind: 'list' }
  | { kind: 'ask_name'; relationship: RelationCode; displayRelation: string }
