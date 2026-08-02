/** Home-screen inbox summary for family / friends rooms. */

import { loadFamilyRoom } from './familyStore'
import { loadFriendsRoom } from './friendsStore'

const SEEN_KEY = 'jarvis.spaceInbox.seen.v1'

export type SpaceInboxKind = 'family' | 'friends'

export type SpaceInboxSeen = {
  familyAt?: number
  friendsAt?: number
}

export type SpaceInboxLine = {
  authorName: string
  text: string
  createdAt: number
  mine: boolean
}

export type SpaceInboxSummary = {
  kind: SpaceInboxKind
  hasRoom: boolean
  name: string
  code: string
  total: number
  unread: number
  recent: SpaceInboxLine[]
}

type HomeInbox = {
  family: SpaceInboxSummary
  friends: SpaceInboxSummary
  unreadTotal: number
}

/** Short-lived cache so one paint (nav + home panel) does not re-parse rooms twice. */
let homeCache: { at: number; value: HomeInbox } | null = null
const HOME_CACHE_MS = 400

export function invalidateSpaceInboxCache(): void {
  homeCache = null
}

function readSeen(): SpaceInboxSeen {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SpaceInboxSeen
  } catch {
    return {}
  }
}

function writeSeen(seen: SpaceInboxSeen): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  } catch {
    /* ignore */
  }
}

export function markSpaceInboxSeen(kind: SpaceInboxKind, at = Date.now()): void {
  const seen = readSeen()
  if (kind === 'family') seen.familyAt = Math.max(seen.familyAt || 0, at)
  else seen.friendsAt = Math.max(seen.friendsAt || 0, at)
  writeSeen(seen)
  invalidateSpaceInboxCache()
}

function clipText(text: string, max = 48): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return '[미디어]'
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** Count unread from the newest messages (stop once past seen watermark). */
function countUnread(
  msgs: Array<{ createdAt: number; authorId: string }>,
  seenAt: number,
  memberId: string,
): number {
  let unread = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.createdAt <= seenAt) break
    if (m.authorId !== memberId) unread++
  }
  return unread
}

export function getSpaceInboxSummary(kind: SpaceInboxKind, recentLimit = 3): SpaceInboxSummary {
  const room = kind === 'family' ? loadFamilyRoom() : loadFriendsRoom()
  const seen = readSeen()
  const seenAt = kind === 'family' ? seen.familyAt || 0 : seen.friendsAt || 0
  if (!room) {
    return {
      kind,
      hasRoom: false,
      name: kind === 'family' ? '가족 방' : '친구 방',
      code: '',
      total: 0,
      unread: 0,
      recent: [],
    }
  }
  const msgs = room.messages || []
  const unread = countUnread(msgs, seenAt, room.memberId)
  const recent = msgs.slice(-recentLimit).reverse().map((m) => ({
    authorName: m.authorName,
    text: clipText(m.text || (m.media ? (m.media.kind === 'video' ? '[동영상]' : '[사진]') : '')),
    createdAt: m.createdAt,
    mine: m.authorId === room.memberId,
  }))
  return {
    kind,
    hasRoom: true,
    name: room.name || (kind === 'family' ? '가족 방' : '친구 방'),
    code: room.code,
    total: msgs.length,
    unread,
    recent,
  }
}

export function getHomeSpaceInbox(): HomeInbox {
  const now = Date.now()
  if (homeCache && now - homeCache.at < HOME_CACHE_MS) {
    return homeCache.value
  }
  const family = getSpaceInboxSummary('family')
  const friends = getSpaceInboxSummary('friends')
  const value = {
    family,
    friends,
    unreadTotal: family.unread + friends.unread,
  }
  homeCache = { at: now, value }
  return value
}
