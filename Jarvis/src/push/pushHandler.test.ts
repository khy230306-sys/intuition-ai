import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Lightweight contract checks on push-handler.js source
 * (service worker cannot run under vitest without a DOM worker shim).
 */
describe('push-handler.js contracts', () => {
  const src = readFileSync(join(process.cwd(), 'public/push-handler.js'), 'utf8')

  it('handles push + notificationclick + deep link params', () => {
    expect(src).toContain("addEventListener('push'")
    expect(src).toContain("addEventListener('notificationclick'")
    expect(src).toContain("searchParams.set('reminderId'")
    expect(src).toContain("searchParams.set('view'")
    expect(src).toContain('aizio-push-received')
  })

  it('does not log endpoints or private keys', () => {
    expect(src.toLowerCase()).not.toContain('vapid_private')
    expect(src).not.toMatch(/console\.log\([^)]*endpoint/)
  })
})
