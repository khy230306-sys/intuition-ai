import { describe, expect, it, afterEach, vi } from 'vitest'
import {
  buildUpdateUrl,
  compareAppVersions,
  parseJarvisVersionFromHtml,
  resolveUpdateBaseUrl,
  FIXED_APP_URL,
  FIXED_PREVIEW_URL,
  LEGACY_PREVIEW_HOST,
} from './appUpdate'

describe('appUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('resolves update base to Preview on fixed / legacy Preview hosts', () => {
    expect(resolveUpdateBaseUrl('light-lab.shipstatic.com')).toBe(FIXED_PREVIEW_URL)
    expect(resolveUpdateBaseUrl(LEGACY_PREVIEW_HOST)).toBe(FIXED_PREVIEW_URL)
    expect(resolveUpdateBaseUrl('jarvis-app.shipstatic.com')).toBe(FIXED_APP_URL)
    expect(resolveUpdateBaseUrl('minimal-veil-3gv8v8i.shipstatic.com')).toBe(FIXED_APP_URL)
  })

  it('builds production update URL with cache busters', () => {
    const url = buildUpdateUrl({
      version: '1.18.2',
      buildId: 'prod-abc',
      step: 2,
      baseUrl: FIXED_APP_URL,
    })
    expect(url.startsWith('https://jarvis-app.shipstatic.com/?')).toBe(true)
    expect(url).toContain('_v=1.18.2')
    expect(url).toContain('_bid=prod-abc')
    expect(url).toContain('_update=2')
    expect(url).toContain('_nocache=')
  })

  it('builds Preview update URL when base is Preview', () => {
    const url = buildUpdateUrl({
      version: '1.20.15',
      buildId: 'preview-abc',
      step: 1,
      baseUrl: FIXED_PREVIEW_URL,
    })
    expect(url.startsWith('https://light-lab.shipstatic.com/?')).toBe(true)
    expect(url).toContain('_v=1.20.15')
  })
})
