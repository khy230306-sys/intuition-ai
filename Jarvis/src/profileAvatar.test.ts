import { describe, expect, it } from 'vitest'
import { isAvatarDataUrl } from './profileAvatar'

describe('profileAvatar', () => {
  it('accepts compact data-url images', () => {
    expect(isAvatarDataUrl('data:image/jpeg;base64,abc')).toBe(true)
    expect(isAvatarDataUrl('https://example.com/a.png')).toBe(false)
    expect(isAvatarDataUrl('')).toBe(false)
  })
})
