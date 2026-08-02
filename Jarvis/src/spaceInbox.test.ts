import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFamilyRoom, postFamilyChat, loadFamilyRoom, saveFamilyRoom } from './familyStore'
import { createFriendsRoom, postFriendsChat } from './friendsStore'
import {
  getHomeSpaceInbox,
  getSpaceInboxSummary,
  invalidateSpaceInboxCache,
  markSpaceInboxSeen,
} from './spaceInbox'

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

describe('spaceInbox', () => {
  beforeEach(() => {
    store.clear()
    invalidateSpaceInboxCache()
  })

  it('counts family/friends messages and unread after mark seen', () => {
    createFamilyRoom('우리가족', '나')
    postFamilyChat('안녕')
    createFriendsRoom('우리친구', '나')
    postFriendsChat('하이')
    const first = getHomeSpaceInbox()
    expect(first.family.total).toBe(1)
    expect(first.friends.total).toBe(1)
    // own messages are not unread
    expect(first.family.unread).toBe(0)
    markSpaceInboxSeen('family')
    markSpaceInboxSeen('friends')
    const after = getHomeSpaceInbox()
    expect(after.unreadTotal).toBe(0)
  })

  it('counts only newer other-author messages as unread (from end)', () => {
    createFamilyRoom('우리가족', '나')
    const room = loadFamilyRoom()!
    const now = Date.now()
    room.messages = [
      {
        id: 'a',
        authorId: 'other',
        authorName: '형',
        text: '옛글',
        createdAt: now - 10_000,
      },
      {
        id: 'b',
        authorId: room.memberId,
        authorName: '나',
        text: '내글',
        createdAt: now - 5_000,
      },
      {
        id: 'c',
        authorId: 'other',
        authorName: '형',
        text: '새글',
        createdAt: now,
      },
    ]
    saveFamilyRoom(room)
    markSpaceInboxSeen('family', now - 6_000)
    invalidateSpaceInboxCache()
    const box = getSpaceInboxSummary('family')
    expect(box.unread).toBe(1)
    expect(box.recent[0]?.text).toBe('새글')
  })

  it('reuses short-lived home inbox cache within a paint window', () => {
    createFamilyRoom('우리가족', '나')
    postFamilyChat('캐시')
    const a = getHomeSpaceInbox()
    const b = getHomeSpaceInbox()
    expect(a).toBe(b)
    invalidateSpaceInboxCache()
    const c = getHomeSpaceInbox()
    expect(c).not.toBe(a)
    expect(c.family.total).toBe(a.family.total)
  })
})
