/** Friends space models — friends chat, notices, schedule — separate from family. */

export type PushSubJson = {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

export type FriendsMember = {
  id: string
  name: string
  joinedAt: number
  push?: PushSubJson | null
}

export type FriendsChatMedia = {
  kind: 'image' | 'video'
  mime: string
  name?: string
  dataUrl: string
  bytes?: number
}

export type FriendsChatMsg = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: number
  media?: FriendsChatMedia
  sourceLanguage?: string
}

export type FriendsNotice = {
  id: string
  authorId: string
  authorName: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type FriendsEvent = {
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

export type FriendsRoom = {
  code: string
  name: string
  createdAt: number
  memberId: string
  memberName: string
  members: FriendsMember[]
  messages: FriendsChatMsg[]
  notices: FriendsNotice[]
  events: FriendsEvent[]
  updatedAt: number
}

export type FriendsSyncPacket =
  | { type: 'hello'; member: FriendsMember; roomName: string; updatedAt: number }
  | { type: 'snapshot'; room: Omit<FriendsRoom, 'memberId' | 'memberName'> }
  | { type: 'chat'; message: FriendsChatMsg }
  | { type: 'notice'; notice: FriendsNotice }
  | { type: 'event'; event: FriendsEvent }
  | { type: 'notice-del'; id: string }
  | { type: 'event-del'; id: string }
