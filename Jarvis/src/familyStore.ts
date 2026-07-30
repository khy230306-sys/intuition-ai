import type {
  FamilyChatMsg,
  FamilyEvent,
  FamilyMember,
  FamilyNotice,
  FamilyRoom,
} from './familyTypes'
import { buildSpaceInviteUrl, parseInviteCode, preferSpaceName } from './inviteJoin'
import { parseJoinReceipt } from './joinReceipt'

const KEY = 'jarvis_family_room_v1'
const MEMBER_KEY = 'jarvis_family_member_id_v1'

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

export function generateFamilyCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function normalizeFamilyCode(raw: string): string {
  return parseInviteCode(raw) || ''
}

export function loadFamilyRoom(): FamilyRoom | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as FamilyRoom
  } catch {
    return null
  }
}

export function saveFamilyRoom(room: FamilyRoom | null): void {
  if (!room) {
    localStorage.removeItem(KEY)
    return
  }
  const trimmed: FamilyRoom = {
    ...room,
    messages: room.messages.slice(-200),
    notices: room.notices.slice(0, 50),
    events: room.events.slice(0, 100),
    members: room.members.slice(0, 20),
    updatedAt: Date.now(),
  }
  localStorage.setItem(KEY, JSON.stringify(trimmed))
}

export function createFamilyRoom(name: string, memberName: string): FamilyRoom {
  const memberId = getOrCreateMemberId()
  const now = Date.now()
  const member: FamilyMember = { id: memberId, name: memberName.trim() || '나', joinedAt: now }
  const room: FamilyRoom = {
    code: generateFamilyCode(),
    name: name.trim() || '우리 가족',
    createdAt: now,
    memberId,
    memberName: member.name,
    members: [member],
    messages: [],
    notices: [],
    events: [],
    updatedAt: now,
  }
  saveFamilyRoom(room)
  return room
}

export function joinFamilyRoomLocal(code: string, name: string, memberName: string): FamilyRoom {
  const normalized = normalizeFamilyCode(code)
  if (!normalized) {
    throw new Error('유효한 가족 초대 코드가 아닙니다.')
  }
  const memberId = getOrCreateMemberId()
  const now = Date.now()
  const member: FamilyMember = { id: memberId, name: memberName.trim() || '나', joinedAt: now }
  const existing = loadFamilyRoom()
  if (existing && existing.code === normalized) {
    existing.memberName = member.name
    existing.memberId = memberId
    if (!existing.members.some((m) => m.id === memberId)) existing.members.push(member)
    else {
      existing.members = existing.members.map((m) => (m.id === memberId ? { ...m, name: member.name } : m))
    }
    saveFamilyRoom(existing)
    return existing
  }
  const room: FamilyRoom = {
    code: normalized,
    name: name.trim() || '가족 공간',
    createdAt: now,
    memberId,
    memberName: member.name,
    members: [member],
    messages: [],
    notices: [],
    events: [],
    updatedAt: now,
  }
  saveFamilyRoom(room)
  return room
}

export function leaveFamilyRoom(): void {
  saveFamilyRoom(null)
}

export function postFamilyChat(text: string): FamilyChatMsg | null {
  const room = loadFamilyRoom()
  if (!room || !text.trim()) return null
  const message: FamilyChatMsg = {
    id: uid(),
    authorId: room.memberId,
    authorName: room.memberName,
    text: text.trim().slice(0, 500),
    createdAt: Date.now(),
  }
  room.messages.push(message)
  saveFamilyRoom(room)
  return message
}

export function addFamilyNotice(title: string, body: string, pinned = false): FamilyNotice | null {
  const room = loadFamilyRoom()
  if (!room || !title.trim()) return null
  const now = Date.now()
  const notice: FamilyNotice = {
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
  saveFamilyRoom(room)
  return notice
}

export function deleteFamilyNotice(id: string): boolean {
  const room = loadFamilyRoom()
  if (!room) return false
  const before = room.notices.length
  room.notices = room.notices.filter((n) => n.id !== id)
  if (room.notices.length === before) return false
  saveFamilyRoom(room)
  return true
}

export function addFamilyEvent(title: string, date: string, time = '', note = ''): FamilyEvent | null {
  const room = loadFamilyRoom()
  if (!room || !title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const now = Date.now()
  const event: FamilyEvent = {
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
  saveFamilyRoom(room)
  return event
}

export function deleteFamilyEvent(id: string): boolean {
  const room = loadFamilyRoom()
  if (!room) return false
  const before = room.events.length
  room.events = room.events.filter((e) => e.id !== id)
  if (room.events.length === before) return false
  saveFamilyRoom(room)
  return true
}

export function mergeFamilySnapshot(
  local: FamilyRoom,
  remote: Omit<FamilyRoom, 'memberId' | 'memberName'>,
): FamilyRoom {
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

  const membersMap = new Map<string, FamilyMember>()
  for (const m of [...local.members, ...remote.members]) {
    const prev = membersMap.get(m.id)
    if (!prev) {
      membersMap.set(m.id, m)
      continue
    }
    membersMap.set(m.id, {
      ...prev,
      name: m.name || prev.name,
      joinedAt: Math.min(prev.joinedAt || m.joinedAt, m.joinedAt || prev.joinedAt),
      push: m.push != null ? m.push : prev.push,
    })
  }

  return {
    ...local,
    name: preferSpaceName(local.name, remote.name, local.updatedAt, remote.updatedAt),
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

export function upsertMember(room: FamilyRoom, member: FamilyMember): FamilyRoom {
  const exists = room.members.some((m) => m.id === member.id)
  room.members = exists
    ? room.members.map((m) =>
        m.id === member.id
          ? {
              ...m,
              name: member.name || m.name,
              push: member.push !== undefined ? member.push : m.push,
            }
          : m,
      )
    : [...room.members, member]
  return room
}

export function familyInviteText(room: FamilyRoom, appUrl: string): string {
  const link = buildSpaceInviteUrl('family', room.code, appUrl)
  return [
    `JARVIS 가족 공간 초대`,
    `이름: ${room.name}`,
    `코드: ${room.code}`,
    '',
    '1) 링크를 열거나 가족 탭에 코드를 붙여넣기 → 참여',
    link,
    '',
    '2) 참여 후 «참여 확인 공유»를 초대자에게 다시 보내세요',
    '3) 둘 다 가족 탭을 연 채로 «동기화»를 누르면 대화가 연결됩니다',
  ].join('\n')
}

export function applyFamilyJoinReceipt(raw: string): { ok: true; message: string } | { ok: false; message: string } {
  const parsed = parseJoinReceipt(raw)
  if (!parsed.ok) return parsed
  const { receipt } = parsed
  if (receipt.kind !== 'family') return { ok: false, message: '가족 참여 확인이 아닙니다.' }
  const room = loadFamilyRoom()
  if (!room) return { ok: false, message: '먼저 가족 공간을 만들어 주세요.' }
  if (room.code !== receipt.code) {
    return { ok: false, message: `코드가 다릅니다. 이 공간은 ${room.code}, 확인은 ${receipt.code}입니다.` }
  }
  if (receipt.memberId === room.memberId) {
    return { ok: false, message: '본인 참여 확인은 추가할 수 없습니다.' }
  }
  upsertMember(room, { id: receipt.memberId, name: receipt.memberName, joinedAt: receipt.at })
  saveFamilyRoom(room)
  return { ok: true, message: `${receipt.memberName}님을 가족 멤버로 등록했습니다.` }
}

export function upcomingFamilyEvents(limit = 5): FamilyEvent[] {
  const room = loadFamilyRoom()
  if (!room) return []
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return room.events
    .filter((e) => e.date >= key)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, limit)
}
