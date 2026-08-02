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
    expect(src).toContain('withTimeout(clearAppCaches()')
    expect(src).toContain('continueBootAfterRefresh')
    expect(src).toContain('paintBootSplash')
  })
})
