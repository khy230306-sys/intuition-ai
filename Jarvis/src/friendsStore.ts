import type {
  FriendsChatMsg,
  FriendsEvent,
  FriendsMember,
  FriendsNotice,
  FriendsRoom,
} from './friendsTypes'

const KEY = 'jarvis_friends_room_v1'
const MEMBER_KEY = 'jarvis_friends_member_id_v1'

function uid(): string {
  return crypto.randomUUID()
}

export function getOrCreateMemberId(): string {
  let id = localStorage.getItem(MEMBER_KEY)
  if (!id) {
    id = uid()
    localStorage.setItem(MEMBER_KEY, id)
  }
  return id
}

export function generateFriendsCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function normalizeFriendsCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
}

export function loadFriendsRoom(): FriendsRoom | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as FriendsRoom
  } catch {
    return null
  }
}

export function saveFriendsRoom(room: FriendsRoom | null): void {
  if (!room) {
    localStorage.removeItem(KEY)
    return
  }
  const trimmed: FriendsRoom = {
    ...room,
    messages: room.messages.slice(-200),
    notices: room.notices.slice(0, 50),
    events: room.events.slice(0, 100),
    members: room.members.slice(0, 20),
    updatedAt: Date.now(),
  }
  localStorage.setItem(KEY, JSON.stringify(trimmed))
}

export function createFriendsRoom(name: string, memberName: string): FriendsRoom {
  const memberId = getOrCreateMemberId()
  const now = Date.now()
  const member: FriendsMember = { id: memberId, name: memberName.trim() || '나', joinedAt: now }
  const room: FriendsRoom = {
    code: generateFriendsCode(),
    name: name.trim() || '우리 친구',
    createdAt: now,
    memberId,
    memberName: member.name,
    members: [member],
    messages: [],
    notices: [],
    events: [],
    updatedAt: now,
  }
  saveFriendsRoom(room)
  return room
}

export function joinFriendsRoomLocal(code: string, name: string, memberName: string): FriendsRoom {
  const memberId = getOrCreateMemberId()
  const now = Date.now()
  const member: FriendsMember = { id: memberId, name: memberName.trim() || '나', joinedAt: now }
  const existing = loadFriendsRoom()
  if (existing && existing.code === normalizeFriendsCode(code)) {
    existing.memberName = member.name
    existing.memberId = memberId
    if (!existing.members.some((m) => m.id === memberId)) existing.members.push(member)
    else {
      existing.members = existing.members.map((m) => (m.id === memberId ? { ...m, name: member.name } : m))
    }
    saveFriendsRoom(existing)
    return existing
  }
  const room: FriendsRoom = {
    code: normalizeFriendsCode(code),
    name: name.trim() || '친구 공간',
    createdAt: now,
    memberId,
    memberName: member.name,
    members: [member],
    messages: [],
    notices: [],
    events: [],
    updatedAt: now,
  }
  saveFriendsRoom(room)
  return room
}

export function leaveFriendsRoom(): void {
  saveFriendsRoom(null)
}

export function postFriendsChat(text: string): FriendsChatMsg | null {
  const room = loadFriendsRoom()
  if (!room || !text.trim()) return null
  const message: FriendsChatMsg = {
    id: uid(),
    authorId: room.memberId,
    authorName: room.memberName,
    text: text.trim().slice(0, 500),
    createdAt: Date.now(),
  }
  room.messages.push(message)
  saveFriendsRoom(room)
  return message
}

export function addFriendsNotice(title: string, body: string, pinned = false): FriendsNotice | null {
  const room = loadFriendsRoom()
  if (!room || !title.trim()) return null
  const now = Date.now()
  const notice: FriendsNotice = {
    id: uid(),
    authorId: room.memberId,
    authorName: room.memberName,
    title: title.trim().slice(0, 80),
    body: body.trim().slice(0, 1000),
    pinned,
    createdAt: now,
    updatedAt: now,
  }
  room.notices.unshift(notice)
  saveFriendsRoom(room)
  return notice
}

export function deleteFriendsNotice(id: string): boolean {
  const room = loadFriendsRoom()
  if (!room) return false
  const before = room.notices.length
  room.notices = room.notices.filter((n) => n.id !== id)
  if (room.notices.length === before) return false
  saveFriendsRoom(room)
  return true
}

export function addFriendsEvent(title: string, date: string, time = '', note = ''): FriendsEvent | null {
  const room = loadFriendsRoom()
  if (!room || !title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const now = Date.now()
  const event: FriendsEvent = {
    id: uid(),
    authorId: room.memberId,
    authorName: room.memberName,
    title: title.trim().slice(0, 80),
    note: note.trim().slice(0, 500),
    date,
    time: time.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }
  room.events.unshift(event)
  saveFriendsRoom(room)
  return event
}

export function deleteFriendsEvent(id: string): boolean {
  const room = loadFriendsRoom()
  if (!room) return false
  const before = room.events.length
  room.events = room.events.filter((e) => e.id !== id)
  if (room.events.length === before) return false
  saveFriendsRoom(room)
  return true
}

export function mergeFriendsSnapshot(
  local: FriendsRoom,
  remote: Omit<FriendsRoom, 'memberId' | 'memberName'>,
): FriendsRoom {
  const byId = <T extends { id: string; updatedAt?: number; createdAt?: number }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>()
    for (const item of [...a, ...b]) {
      const prev = map.get(item.id)
      if (!prev) {
        map.set(item.id, item)
        continue
      }
      const prevT = prev.updatedAt ?? prev.createdAt ?? 0
      const nextT = item.updatedAt ?? item.createdAt ?? 0
      if (nextT >= prevT) map.set(item.id, item)
    }
    return [...map.values()]
  }

  const membersMap = new Map<string, FriendsMember>()
  for (const m of [...local.members, ...remote.members]) membersMap.set(m.id, m)

  return {
    ...local,
    name: remote.updatedAt >= local.updatedAt ? remote.name || local.name : local.name,
    code: local.code || remote.code,
    members: [...membersMap.values()],
    messages: byId(local.messages, remote.messages)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-200),
    notices: byId(local.notices, remote.notices)
      .sort((a, b) => (b.pinned === a.pinned ? b.updatedAt - a.updatedAt : Number(b.pinned) - Number(a.pinned)))
      .slice(0, 50),
    events: byId(local.events, remote.events)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 100),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, Date.now()),
  }
}

export function upsertMember(room: FriendsRoom, member: FriendsMember): FriendsRoom {
  const exists = room.members.some((m) => m.id === member.id)
  room.members = exists
    ? room.members.map((m) => (m.id === member.id ? { ...m, name: member.name } : m))
    : [...room.members, member]
  return room
}

export function friendsInviteText(room: FriendsRoom, appUrl: string): string {
  return [
    `JARVIS 친구 공간 초대`,
    `이름: ${room.name}`,
    `코드: ${room.code}`,
    '',
    '1) JARVIS 앱 열기',
    '2) 하단 친구 탭',
    `3) 코드 ${room.code} 입력 후 참여`,
    appUrl,
  ].join('\n')
}

export function upcomingFriendsEvents(limit = 5): FriendsEvent[] {
  const room = loadFriendsRoom()
  if (!room) return []
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return room.events
    .filter((e) => e.date >= key)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, limit)
}
