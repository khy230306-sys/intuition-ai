import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertSameOwner,
  ensureGuestIdentity,
  getActiveAuthAdapter,
  namespacedKey,
  planGuestMigration,
  resetGuestIdentityForTests,
  resolveStorageKey,
  withOwner,
} from './index'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', { randomUUID: () => 'user-test-uuid-0001' })

beforeEach(() => {
  store.clear()
  resetGuestIdentityForTests()
})

describe('guest identity', () => {
  it('creates stable guest userId/deviceId', () => {
    const a = ensureGuestIdentity()
    const b = ensureGuestIdentity()
    expect(a.userId).toBe(b.userId)
    expect(a.deviceId).toBe(b.deviceId)
    expect(a.mode).toBe('guest')
  })

  it('guest signIn reports unavailable honestly', async () => {
    const auth = getActiveAuthAdapter()
    const r = await auth.signIn?.()
    expect(r?.ok).toBe(false)
    expect(r?.message).toMatch(/로그인|게스트/)
  })

  it('plans guest migration without claiming sync', () => {
    const g = ensureGuestIdentity()
    const plan = planGuestMigration('acct_123')
    expect(plan.guestUserId).toBe(g.userId)
    expect(plan.note).toMatch(/네임스페이스|login/i)
  })

  it('uses flat keys for guest, namespaced for authenticated', () => {
    const guest = ensureGuestIdentity()
    expect(resolveStorageKey('jarvis_chat_v1', guest)).toBe('jarvis_chat_v1')
    const auth = { ...guest, mode: 'authenticated' as const, userId: 'u9' }
    expect(resolveStorageKey('jarvis_chat_v1', auth)).toBe(namespacedKey('u9', 'jarvis_chat_v1'))
  })

  it('withOwner tags records; assertSameOwner blocks cross-user', () => {
    const id = ensureGuestIdentity()
    const row = withOwner({ text: 'hi' }, id)
    expect(row.ownerUserId).toBe(id.userId)
    expect(assertSameOwner(row.ownerUserId, id)).toBe(true)
    expect(assertSameOwner('other-user', id)).toBe(false)
  })
})
