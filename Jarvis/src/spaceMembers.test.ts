import { describe, expect, it } from 'vitest'
import { dedupeMembersByName, uniqueMemberNames } from './spaceMembers'

describe('spaceMembers', () => {
  it('collapses same display name with different ids', () => {
    const out = dedupeMembersByName(
      [
        { id: 'a', name: '주인님', joinedAt: 100 },
        { id: 'b', name: '주인님', joinedAt: 200 },
        { id: 'c', name: '성규', joinedAt: 150 },
        { id: 'd', name: ' 주인님 ', joinedAt: 50 },
      ],
      'b',
    )
    expect(out).toHaveLength(2)
    expect(out.find((m) => m.name.trim() === '성규')?.id).toBe('c')
    expect(out.find((m) => m.name.trim() === '주인님' || m.name.includes('주인님'))?.id).toBe('b')
  })

  it('prefers member with push when no preferId match', () => {
    const out = dedupeMembersByName([
      { id: 'a', name: '친구', joinedAt: 10 },
      { id: 'b', name: '친구', joinedAt: 20, push: { endpoint: 'x' } },
    ])
    expect(out).toHaveLength(1)
    expect(out[0]?.id).toBe('b')
  })

  it('uniqueMemberNames drops duplicate labels', () => {
    expect(uniqueMemberNames([{ name: '성규' }, { name: '주인님' }, { name: '주인님' }], '나')).toEqual([
      '성규',
      '주인님',
    ])
  })
})
