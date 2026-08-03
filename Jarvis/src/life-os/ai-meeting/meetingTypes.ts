export type MeetingRole =
  | 'planning'
  | 'engineering'
  | 'ux'
  | 'security'
  | 'ops'
  | 'qa'

export type MeetingPerspective = {
  role: MeetingRole
  label: string
  points: string[]
}

export type MeetingResult = {
  id: string
  topic: string
  summary: string
  perspectives: MeetingPerspective[]
  dissent: string[]
  conclusion: string
  nextActions: string[]
  usedAi: boolean
  providerNote: string
  createdAt: string
}
