import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFamilyRoom, postFamilyChat } from './familyStore'
import { createFriendsRoom, postFriendsChat } from './friendsStore'
import { getHomeSpaceInbox, markSpaceInboxSeen } from './spaceInbox'

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
  beforeEach(() => store.clear())

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
})
