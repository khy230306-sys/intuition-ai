import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFamilyRoom,
  joinFamilyRoomLocal,
  loadFamilyRoom,
  mergeFamilySnapshot,
  postFamilyChat,
  addFamilyNotice,
  addFamilyEvent,
  leaveFamilyRoom,
  saveFamilyRoom,
  upsertMember,
  clearFamilyChat,
} from './familyStore'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

vi.stubGlobal('crypto', {
  randomUUID: () => `id-${store.size}-${Math.random().toString(16).slice(2)}`,
})

describe('family space', () => {
  beforeEach(() => store.clear())

  it('creates room and posts chat/notice/event', () => {
    const room = createFamilyRoom('테스트가족', '아빠')
    expect(room.code).toHaveLength(6)
    expect(postFamilyChat('안녕')?.text).toBe('안녕')
    expect(addFamilyNotice('공지', '내용', true)?.pinned).toBe(true)
    expect(addFamilyEvent('소풍', '2026-08-01', '10:00')?.title).toBe('소풍')
    const loaded = loadFamilyRoom()
    expect(loaded?.messages).toHaveLength(1)
    expect(loaded?.notices[0].title).toBe('공지')
    expect(loaded?.events[0].date).toBe('2026-08-01')
  })

  it('joins by code and merges snapshots', () => {
    const a = createFamilyRoom('A', '엄마')
    postFamilyChat('첫 메시지')
    const snap = loadFamilyRoom()!
    leaveFamilyRoom()
    const b = joinFamilyRoomLocal(a.code, '가족', '아들')
    expect(b.code).toBe(a.code)
    const merged = mergeFamilySnapshot(b, {
      code: snap.code,
      name: snap.name,
      createdAt: snap.createdAt,
      members: snap.members,
      messages: snap.messages,
      notices: snap.notices,
      events: snap.events,
      updatedAt: snap.updatedAt,
    })
    expect(merged.messages.some((m) => m.text === '첫 메시지')).toBe(true)
    expect(merged.members.length).toBeGreaterThanOrEqual(1)
  })

  it('clears chat while keeping notices and members', () => {
    createFamilyRoom('테스트가족', '아빠')
    postFamilyChat('지울 메시지')
    addFamilyNotice('유지 공지', '내용')
    expect(clearFamilyChat()).toBe(true)
    const loaded = loadFamilyRoom()!
    expect(loaded.messages).toHaveLength(0)
    expect(loaded.notices).toHaveLength(1)
    expect(loaded.members.length).toBeGreaterThanOrEqual(1)
  })

  it('dedupes members with the same display name', () => {
    const room = createFamilyRoom('우리', '주인님')
    upsertMember(room, { id: 'dup-1', name: '주인님', joinedAt: Date.now() })
    upsertMember(room, { id: 'dup-2', name: ' 주인님 ', joinedAt: Date.now() + 1 })
    upsertMember(room, { id: 'other', name: '성규', joinedAt: Date.now() })
    saveFamilyRoom(room)
    const loaded = loadFamilyRoom()!
    const names = loaded.members.map((m) => m.name.trim().toLowerCase())
    expect(names.filter((n) => n === '주인님')).toHaveLength(1)
    expect(names).toContain('성규')
    expect(loaded.members).toHaveLength(2)
  })
})
