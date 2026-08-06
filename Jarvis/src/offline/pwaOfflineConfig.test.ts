import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('PWA offline shell config', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

  it('vite PWA uses absolute start_url/scope and offline importScripts', () => {
    const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8')
    expect(vite).toContain("start_url: '/?source=pwa'")
    expect(vite).toContain("scope: '/'")
    expect(vite).toContain("id: '/?source=pwa'")
    expect(vite).toContain('offline-shell.js')
    expect(vite).toContain('navigateFallback: \'index.html\'')
    expect(vite).toContain('push-handler.js')
    // Conflicting NetworkFirst navigate route removed — NavigationRoute owns document loads
    expect(vite).not.toMatch(/request\.mode === 'navigate'[\s\S]*NetworkFirst/)
    expect(vite).toContain('build-meta.json')
    expect(vite).toMatch(/NetworkOnly/)
  })

  it('offline-shell.js verifies caches without stealing fetch from Workbox', () => {
    const sw = readFileSync(join(root, 'public/offline-shell.js'), 'utf8')
    expect(sw).toContain('verify-shell')
    expect(sw).not.toContain('addEventListener(\'fetch\'')
    expect(sw).toContain('aizio-offline')
  })

  it('offline.html exists as precacheable fallback page', () => {
    const html = readFileSync(join(root, 'public/offline.html'), 'utf8')
    expect(html).toContain('오프라인')
    expect(html).toContain('source=pwa')
  })

  it('clearAppCaches keeps SW by default (main.ts)', () => {
    const main = readFileSync(join(root, 'src/main.ts'), 'utf8')
    expect(main).toContain('unregisterServiceWorker')
    expect(main).toContain('onOfflineReady')
    expect(main).toContain('renderOfflineSettingsPanel')
    expect(main).toContain('warmAppShell')
  })
})
