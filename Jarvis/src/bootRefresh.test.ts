import { describe, expect, it } from 'vitest'
import { parseJarvisVersionFromHtml } from './appUpdate'

describe('boot / version refresh safety', () => {
  it('parses jarvis-version from html', () => {
    expect(parseJarvisVersionFromHtml('<meta name="jarvis-version" content="1.11.3">')).toBe('1.11.3')
  })

  it('hardRefresh helpers do not leave boot without a paint path', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./main.ts', import.meta.url), 'utf8')
    expect(src).toContain('data-boot-splash')
    expect(src).toMatch(/withTimeout\(clearAppCaches\(/)
    expect(src).toContain('continueBootAfterRefresh')
    expect(src).toContain('paintBootSplash')
    // Auto SW update must soft-apply; hard wipe caused intermittent blank screens.
    expect(src).toContain('updateSW(true)')
    expect(src).toContain('markAppBooted')
    // Forced update must clear SW before version probe and land on fixed host
    expect(src).toContain('waitForServiceWorkerGone')
    expect(src).toContain('fetchRemoteBuildMeta')
    expect(src).toContain('writePendingUpdate')
    expect(src).toContain('buildUpdateUrl')
  })

  it('workbox does not precache build-meta (stale update checks)', async () => {
    const fs = await import('node:fs')
    const vite = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
    expect(vite).toContain("globIgnores: ['**/build-meta.json'")
    expect(vite).toContain("handler: 'NetworkOnly'")
    expect(vite).toMatch(/build-meta\.json/)
    expect(vite).not.toContain("ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^_ship$/, /^_v$/, /^_t$/, /^_check$/]")
  })

  it('index.html paints dark inline splash before modules load', async () => {
    const fs = await import('node:fs')
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    expect(html).toContain('data-boot-inline')
    expect(html).toContain('background: #070b12')
    expect(html).toContain('__aizioMarkBooted')
  })
})
