/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  autoSaveClipToAlbum,
  extForMime,
  formatBytes,
  formatElapsed,
  pickRecorderMime,
  supportsMediaRecorder,
} from './recorder'
import { defaultScreenRecordState } from './ui/recordScreen'
import { isScreenRecordOpen } from '../commandRouter/router'
import { routeCommand } from '../commandRouter/router'
import type { RecordedClip } from './types'

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

  it('default state prefers phone-screen (display) mode', () => {
    const st = defaultScreenRecordState()
    expect(st.mode).toBe('display')
    expect(st.recorderSupported).toBe(supportsMediaRecorder())
    expect(st.phase).toBe('idle')
    expect(st.systemGuideOpen).toBe(false)
  })

  it('pickRecorderMime returns string (possibly empty in node)', () => {
    expect(typeof pickRecorderMime()).toBe('string')
  })
})

describe('autoSaveClipToAlbum', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-downloads when share API is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0',
        platform: 'Linux x86_64',
        maxTouchPoints: 0,
      },
    })
    const createObjectURL = vi.fn(() => 'blob:aizio-test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })

    const clip: RecordedClip = {
      blob: new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'video/webm' }),
      mime: 'video/webm',
      name: 'aizio-record-camera-test.webm',
      bytes: 5,
      createdAt: Date.now(),
      mode: 'camera',
    }
    const r = await autoSaveClipToAlbum(clip)
    expect(r.ok).toBe(true)
    expect(r.method).toBe('download')
    expect(createObjectURL).toHaveBeenCalled()
    expect(r.message).toMatch(/저장/)
  })

  it('opens share sheet when canShare accepts the file', async () => {
    const share = vi.fn(async () => undefined)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
        canShare: () => true,
        share,
      },
    })
    const clip: RecordedClip = {
      blob: new Blob([new Uint8Array([9, 9, 9])], { type: 'video/mp4' }),
      mime: 'video/mp4',
      name: 'aizio-record-camera-test.mp4',
      bytes: 3,
      createdAt: Date.now(),
      mode: 'camera',
    }
    const r = await autoSaveClipToAlbum(clip)
    expect(r.ok).toBe(true)
    expect(r.method).toBe('share')
    expect(share).toHaveBeenCalled()
    expect(r.message).toMatch(/사진첩|비디오 저장|공유/)
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
