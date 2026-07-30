import { describe, expect, it } from 'vitest'
import {
  buildSpaceInviteUrl,
  parseInviteCode,
  parseInviteFromLocation,
  preferSpaceName,
  stripInviteParamsFromUrl,
} from './inviteJoin'

describe('invite join helpers', () => {
  it('parses bare codes and rejects invite-text garbage', () => {
    expect(parseInviteCode('k7m2pq')).toBe('K7M2PQ')
    expect(parseInviteCode('코드 MNBV2')).toBe('MNBV2')
    expect(
      parseInviteCode(
        ['JARVIS 친구 공간 초대', '이름: 우리 친구', '코드: VQT3NY', '', 'https://example.com'].join('\n'),
      ),
    ).toBe('VQT3NY')
    // Old bug: first 8 alphanumerics became JARVISK7
    expect(parseInviteCode('JARVIS 친구 초대\n코드 K7M2PQ\nhttps://x.com')).toBe('K7M2PQ')
    expect(parseInviteCode('hello world')).toBeNull()
  })

  it('parses deep-link URLs', () => {
    expect(parseInviteCode('https://app.example/?friends=K7M2PQ')).toBe('K7M2PQ')
    expect(parseInviteCode('https://app.example/?family=XY2Z34')).toBe('XY2Z34')
    expect(parseInviteFromLocation('https://app.example/?friends=VQT3NY')).toEqual({
      kind: 'friends',
      code: 'VQT3NY',
    })
    expect(parseInviteFromLocation('https://app.example/?family=VQT3NY')).toEqual({
      kind: 'family',
      code: 'VQT3NY',
    })
  })

  it('builds invite URLs and strips params', () => {
    const url = buildSpaceInviteUrl('friends', 'VQT3NY', 'https://app.example/jarvis')
    expect(url).toContain('friends=VQT3NY')
    expect(stripInviteParamsFromUrl('https://app.example/?friends=VQT3NY&x=1')).toContain('x=1')
    expect(stripInviteParamsFromUrl('https://app.example/?friends=VQT3NY&x=1')).not.toContain('friends=')
  })

  it('prefers custom room names over generic joiner names', () => {
    expect(preferSpaceName('테스트방', '친구 공간', 1, 99)).toBe('테스트방')
    expect(preferSpaceName('친구 공간', '우리 친구들', 1, 2)).toBe('우리 친구들')
  })
})
