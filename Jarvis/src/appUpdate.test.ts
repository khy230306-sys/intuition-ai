import { describe, expect, it } from 'vitest'
import { parseJarvisVersionFromHtml } from './appUpdate'

describe('appUpdate', () => {
  it('parses version from meta and title', () => {
    expect(
      parseJarvisVersionFromHtml('<meta name="jarvis-version" content="1.9.0">'),
    ).toBe('1.9.0')
    expect(parseJarvisVersionFromHtml('<title>AIZIO 1.8.9</title>')).toBe('1.8.9')
    expect(parseJarvisVersionFromHtml('<title>JARVIS 1.8.8</title>')).toBe('1.8.8')
    expect(parseJarvisVersionFromHtml('<html></html>')).toBeNull()
  })
})
