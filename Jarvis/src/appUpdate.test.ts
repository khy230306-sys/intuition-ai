import { describe, expect, it } from 'vitest'
import {
  buildUpdateUrl,
  compareAppVersions,
  parseJarvisVersionFromHtml,
} from './appUpdate'

describe('appUpdate', () => {
  it('parses version from meta and title', () => {
    expect(
      parseJarvisVersionFromHtml('<meta name="jarvis-version" content="1.9.0">'),
    ).toBe('1.9.0')
    expect(parseJarvisVersionFromHtml('<title>AIZIO 1.8.9</title>')).toBe('1.8.9')
    expect(parseJarvisVersionFromHtml('<title>JARVIS 1.8.8</title>')).toBe('1.8.8')
    expect(parseJarvisVersionFromHtml('<html></html>')).toBeNull()
  })

  it('compares semver-ish versions', () => {
    expect(compareAppVersions('1.18.2', '1.18.1')).toBe(1)
    expect(compareAppVersions('1.18.1', '1.18.2')).toBe(-1)
    expect(compareAppVersions('1.18.1', '1.18.1')).toBe(0)
    expect(compareAppVersions('2.0.0', '1.99.9')).toBe(1)
  })

  it('builds production update URL with cache busters', () => {
    const url = buildUpdateUrl({ version: '1.18.2', buildId: 'prod-abc', step: 2 })
    expect(url.startsWith('https://jarvis-app.shipstatic.com/?')).toBe(true)
    expect(url).toContain('_v=1.18.2')
    expect(url).toContain('_bid=prod-abc')
    expect(url).toContain('_update=2')
    expect(url).toContain('_nocache=')
  })
})
