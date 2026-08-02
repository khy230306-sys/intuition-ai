import { describe, expect, it } from 'vitest'
import { isRelayLinkDead, summarizeRelaySockets } from './spaceSyncConfig'

describe('relay health', () => {
  it('summarizes open vs closed sockets', () => {
    const h = summarizeRelaySockets({
      a: { readyState: 1 },
      b: { readyState: 3 },
    })
    expect(h.ok).toBe(1)
    expect(h.total).toBe(2)
    expect(isRelayLinkDead(h)).toBe(false)
  })

  it('marks all-closed sockets as dead (post-background zombie)', () => {
    const h = summarizeRelaySockets({
      a: { readyState: 3 },
      b: { readyState: 2 },
    })
    expect(h.ok).toBe(0)
    expect(isRelayLinkDead(h)).toBe(true)
  })

  it('treats empty socket map as connecting, not dead', () => {
    const h = summarizeRelaySockets({})
    expect(h.total).toBe(0)
    expect(isRelayLinkDead(h)).toBe(false)
  })
})
