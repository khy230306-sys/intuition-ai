export type CompanionKind = 'morning' | 'evening'

export type CompanionEntry = {
  id: string
  kind: CompanionKind
  text: string
  fingerprint: string
  at: string
}
