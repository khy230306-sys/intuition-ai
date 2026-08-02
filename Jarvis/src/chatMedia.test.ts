import { describe, expect, it } from 'vitest'
import { isImageMime, isVideoMime, mediaCaption, MAX_VIDEO_BYTES } from './chatMedia'

describe('chatMedia', () => {
  it('detects mime kinds', () => {
    expect(isImageMime('image/jpeg')).toBe(true)
    expect(isVideoMime('video/mp4')).toBe(true)
    expect(isImageMime('application/pdf')).toBe(false)
  })

  it('builds captions', () => {
    expect(mediaCaption({ kind: 'image', mime: 'image/jpeg', dataUrl: 'x', bytes: 1 }, '')).toBe('[사진]')
    expect(mediaCaption({ kind: 'video', mime: 'video/mp4', dataUrl: 'x', bytes: 1 }, '안녕')).toBe('안녕')
    expect(MAX_VIDEO_BYTES).toBeGreaterThan(1_000_000)
  })
})
