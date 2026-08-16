import { describe, expect, it } from 'vitest'
import {
  extForMime,
  formatBytes,
  formatElapsed,
  pickRecorderMime,
  supportsDisplayCapture,
  supportsMediaRecorder,
} from './recorder'
import { defaultScreenRecordState } from './ui/recordScreen'
import { isScreenRecordOpen } from '../commandRouter/router'
import { routeCommand } from '../commandRouter/router'

describe('screen-record helpers', () => {
  it('formats elapsed and bytes', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(65_000)).toBe('01:05')
    expect(formatBytes(500)).toMatch(/B/)
    expect(formatBytes(2048)).toMatch(/KB/)
  })

  it('maps mime to extension', () => {
    expect(extForMime('video/mp4')).toBe('mp4')
    expect(extForMime('video/webm;codecs=vp8')).toBe('webm')
  })

  it('default state prefers available mode', () => {
    const st = defaultScreenRecordState()
    expect(st.recorderSupported).toBe(supportsMediaRecorder())
    if (supportsDisplayCapture()) expect(st.mode).toBe('display')
    else expect(st.mode).toBe('camera')
    expect(st.phase).toBe('idle')
  })

  it('pickRecorderMime returns string (possibly empty in node)', () => {
    expect(typeof pickRecorderMime()).toBe('string')
  })
})

describe('screen.record command routing', () => {
  it('detects open phrases', () => {
    expect(isScreenRecordOpen('화면 녹화 열어줘')).toBe(true)
    expect(isScreenRecordOpen('휴대폰 녹화')).toBe(true)
    expect(isScreenRecordOpen('영상 녹화 시작')).toBe(true)
    expect(isScreenRecordOpen('스크린 레코딩')).toBe(true)
    expect(isScreenRecordOpen('카메라 열어줘')).toBe(false)
    expect(isScreenRecordOpen('오늘 날씨 알려줘')).toBe(false)
  })

  it('routes to screen.record.open', () => {
    const r = routeCommand({ text: '화면 녹화해줘' })
    expect(r.intent).toBe('screen.record.open')
    expect(r.forbiddenActions).toContain('weather')
  })
})
