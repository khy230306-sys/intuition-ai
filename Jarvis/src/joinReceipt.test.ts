import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildJoinReceipt, parseJoinReceipt } from './joinReceipt'
import { applyFamilyJoinReceipt, createFamilyRoom, leaveFamilyRoom, loadFamilyRoom } from './familyStore'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
})
vi.stubGlobal('crypto', {
  randomUUID: () => `id-${store.size}-${Math.random().toString(16).slice(2)}`,
})

describe('join receipts', () => {
  beforeEach(() => store.clear())

  it('builds and parses join receipts from full share text', () => {
    const built = buildJoinReceipt({
      kind: 'family',
      code: 'EWFVFH',
      memberId: 'member-b',
      memberName: '엄마',
      at: 1700000000000,
    })
    expect(built.payload).toContain('JARVIS-JOIN|v1|family|EWFVFH|')
    const parsed = parseJoinReceipt(built.message)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.receipt.memberName).toBe('엄마')
    expect(parsed.receipt.code).toBe('EWFVFH')
  })

  it('registers a family member from join receipt', () => {
    leaveFamilyRoom()
    const host = createFamilyRoom('우리 가족', '김성규')
    const guest = buildJoinReceipt({
      kind: 'family',
      code: host.code,
      memberId: 'guest-1',
      memberName: '아빠',
    })
    const result = applyFamilyJoinReceipt(guest.message)
    expect(result.ok).toBe(true)
    const room = loadFamilyRoom()
    expect(room?.members.some((m) => m.id === 'guest-1' && m.name === '아빠')).toBe(true)
  })
})
