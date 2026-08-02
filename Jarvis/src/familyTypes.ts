/** Family space models — shared chat, notices, schedule. */

export type PushSubJson = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

export type FamilyMember = {
  id: string
  name: string
  joinedAt: number
  /** Web Push subscription for background chat alerts */
  push?: PushSubJson | null
}

export type FamilyChatMedia = {
  kind: 'image' | 'video'
  mime: string
  name?: string
  dataUrl: string
  bytes?: number
}

export type FamilyChatMsg = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: number
  /** Optional photo/video payload (size-capped data URL). */
  media?: FamilyChatMedia
  /** BCP47-ish language of originalText when known. */
  sourceLanguage?: string
}

export type FamilyNotice = {
  id: string
  authorId: string
  authorName: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type FamilyEvent = {
  id: string
  authorId: string
  authorName: string
  title: string
  note: string
  /** Local date YYYY-MM-DD */
  date: string
  /** Optional HH:mm */
  time?: string
  createdAt: number
  updatedAt: number
}

export type FamilyRoom = {
  code: string
  name: string
  createdAt: number
  memberId: string
  memberName: string
  members: FamilyMember[]
  messages: FamilyChatMsg[]
  notices: FamilyNotice[]
  events: FamilyEvent[]
  updatedAt: number
  /** Messages at or before this timestamp stay cleared (survives sync merge). */
  chatClearedAt?: number
}

export type FamilySyncPacket =
  | { type: 'hello'; member: FamilyMember; roomName: string; updatedAt: number }
  | { type: 'snapshot'; room: Omit<FamilyRoom, 'memberId' | 'memberName'> }
  | { type: 'chat'; message: FamilyChatMsg }
  | { type: 'chat-clear'; clearedAt: number }
  | { type: 'notice'; notice: FamilyNotice }
  | { type: 'event'; event: FamilyEvent }
  | { type: 'notice-del'; id: string }
  | { type: 'event-del'; id: string }
