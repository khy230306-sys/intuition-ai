import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFriendsRoom,
  joinFriendsRoomLocal,
  loadFriendsRoom,
  mergeFriendsSnapshot,
  postFriendsChat,
  addFriendsNotice,
  addFriendsEvent,
  leaveFriendsRoom,
} from './friendsStore'

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

describe('friends space', () => {
  beforeEach(() => store.clear())

  it('creates room and posts chat/notice/event', () => {
    const room = createFriendsRoom('테스트친구', '아빠')
    expect(room.code).toHaveLength(6)
    expect(postFriendsChat('안녕')?.text).toBe('안녕')
    expect(addFriendsNotice('공지', '내용', true)?.pinned).toBe(true)
    expect(addFriendsEvent('소풍', '2026-08-01', '10:00')?.title).toBe('소풍')
    const loaded = loadFriendsRoom()
    expect(loaded?.messages).toHaveLength(1)
    expect(loaded?.notices[0].title).toBe('공지')
    expect(loaded?.events[0].date).toBe('2026-08-01')
  })

  it('joins by code and merges snapshots', () => {
    const a = createFriendsRoom('A', '엄마')
    postFriendsChat('첫 친구 메시지')
    const snap = loadFriendsRoom()!
    leaveFriendsRoom()
    const b = joinFriendsRoomLocal(a.code, '친구', '민수')
    expect(b.code).toBe(a.code)
    const merged = mergeFriendsSnapshot(b, {
      code: snap.code,
      name: snap.name,
      createdAt: snap.createdAt,
      members: snap.members,
      messages: snap.messages,
      notices: snap.notices,
      events: snap.events,
      updatedAt: snap.updatedAt,
    })
    expect(merged.messages.some((m) => m.text === '첫 친구 메시지')).toBe(true)
    expect(merged.members.length).toBeGreaterThanOrEqual(1)
  })
})
