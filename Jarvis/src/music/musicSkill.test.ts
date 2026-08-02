import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockMusicProvider } from './providers/mockMusicProvider'
import { registerMusicProvider } from './musicProvider'
import { resetMusicSession } from './musicSession'
import { tryHandleMusicSkill } from './musicSkill'

describe('AIZIO Music Skill handler', () => {
  beforeEach(() => {
    resetMusicSession()
    registerMusicProvider(createMockMusicProvider())
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('prepares play with gesture (does not claim playing)', async () => {
    const reply = await tryHandleMusicSkill('조용한 음악 틀어줘', 'ko')
    expect(reply).toBeTruthy()
    expect(reply!.session.status).toBe('ready')
    expect(reply!.needsGesture).toBe(true)
    expect(reply!.text).not.toMatch(/음악을 틀었어요/)
    expect(reply!.playUrl).toMatch(/^https:\/\/www\.youtube\.com\//)
  })

  it('returns null for normal AI questions', async () => {
    expect(await tryHandleMusicSkill('오늘 일정 알려줘', 'ko')).toBeNull()
  })

  it('handles stop without fake external success', async () => {
    await tryHandleMusicSkill('카페 분위기 음악 틀어줘', 'ko')
    const stop = await tryHandleMusicSkill('음악 중지', 'ko')
    expect(stop?.session.status).toBe('stopped')
    expect(stop?.text).toBeTruthy()
  })

  it('volume hint does not fake device volume change', async () => {
    await tryHandleMusicSkill('조용한 음악 틀어줘', 'ko')
    const vol = await tryHandleMusicSkill('볼륨 조금 낮춰줘', 'ko')
    expect(vol?.text).toMatch(/볼륨 버튼|volume buttons/i)
  })
})
