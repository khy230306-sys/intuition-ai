import { describe, expect, it } from 'vitest'
import { buildMusicSearchQuery, classifyMusicIntent } from './musicIntent'

describe('AIZIO Music Intent Classifier', () => {
  it('detects calm play request', () => {
    const r = classifyMusicIntent('조용한 음악 틀어줘', 'ko')
    expect(r?.intent).toBe('play_music')
    expect(r?.mood).toBe('calm')
    expect(r?.searchQuery).toMatch(/플레이리스트|음악/)
  })

  it('passes non-music to AI (null)', () => {
    expect(classifyMusicIntent('오늘 일정 알려줘', 'ko')).toBeNull()
    expect(classifyMusicIntent('날씨 어때', 'ko')).toBeNull()
  })

  it('detects focus music', () => {
    const r = classifyMusicIntent('집중할 때 듣기 좋은 음악 재생해줘', 'ko')
    expect(r?.intent).toBe('play_music')
    expect(r?.mood).toBe('focus')
    expect(r?.instrumental === true || r?.instrumental === 'preferred').toBe(true)
  })

  it('detects sleep / kids calm music', () => {
    const r = classifyMusicIntent('아이 재울 때 들을 잔잔한 음악 틀어줘', 'ko')
    expect(r?.intent).toBe('play_music')
    expect(r?.mood === 'sleep' || r?.mood === 'kids' || r?.mood === 'calm').toBe(true)
  })

  it('detects rain / cafe moods', () => {
    expect(classifyMusicIntent('비 오는 날 어울리는 음악 찾아줘', 'ko')?.mood).toBe('rain')
    expect(classifyMusicIntent('카페 분위기 음악 틀어줘', 'ko')?.mood).toBe('cafe')
  })

  it('detects change_mood', () => {
    const r = classifyMusicIntent('방금 음악보다 더 조용한 걸로 바꿔줘', 'ko')
    expect(r?.intent).toBe('change_mood')
    expect(r?.mood).toBe('calm')
  })

  it('detects next / stop / resume', () => {
    expect(classifyMusicIntent('다음 곡', 'ko')?.intent).toBe('next_track')
    expect(classifyMusicIntent('음악 멈춰', 'ko')?.intent).toBe('pause_music')
    expect(classifyMusicIntent('다시 재생해', 'ko')?.intent).toBe('resume_music')
  })

  it('detects volume (external-app honest path later)', () => {
    expect(classifyMusicIntent('볼륨 조금 낮춰줘', 'ko')?.intent).toBe('lower_volume')
  })

  it('builds search query without command verbs', () => {
    const intent = classifyMusicIntent('비 오는 날 조용히 듣기 좋은 음악 틀어줘', 'ko')!
    const q = buildMusicSearchQuery(intent.rawText, intent, 'ko')
    expect(q).not.toMatch(/틀어/)
    expect(q.length).toBeGreaterThan(4)
  })

  it('artist-ish request keeps name', () => {
    const r = classifyMusicIntent('아이유 노래 틀어줘', 'ko')
    expect(r?.intent).toBe('play_music')
    expect(r?.artist || r?.searchQuery).toBeTruthy()
  })

  it('english / japanese / vietnamese play cues', () => {
    expect(classifyMusicIntent('play calm music', 'en')?.intent).toBe('play_music')
    expect(classifyMusicIntent('静かな音楽をかけて', 'ja')?.intent).toBe('play_music')
    expect(classifyMusicIntent('phát nhạc êm dịu', 'vi')?.intent).toBe('play_music')
  })

  it('ambiguous knowledge questions fall through', () => {
    expect(classifyMusicIntent('재즈 음악이 뭐야?', 'ko')).toBeNull()
  })
})
