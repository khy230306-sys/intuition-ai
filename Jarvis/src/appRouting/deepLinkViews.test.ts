import { describe, expect, it } from 'vitest'
import { hashScreenToView, parseLocationHash, viewToHashScreen } from './hashRoute'

/** Views that must survive refresh via location.hash */
const DEEP_LINK_VIEWS = [
  'home',
  'chat',
  'schedule',
  'family-helper',
  'more',
  'settings',
  'games',
  'travel',
  'restaurant',
  'friends',
  'navigation',
  'ai-camera',
  'invest',
  'customers',
  'actions',
  'global',
] as const

describe('deep-link view ↔ hash round-trip', () => {
  for (const view of DEEP_LINK_VIEWS) {
    it(`${view} survives hash round-trip`, () => {
      const screen = viewToHashScreen(view)
      const parsed = parseLocationHash(`#${screen}`)
      expect(parsed.valid).toBe(true)
      expect(hashScreenToView(parsed.screen)).toBe(view)
    })
  }

  it('legacy #family-helper opens family helper', () => {
    expect(parseLocationHash('#family-helper').valid).toBe(true)
    expect(hashScreenToView('family-helper')).toBe('family-helper')
  })

  it('멤버 space uses #family-room', () => {
    expect(viewToHashScreen('family')).toBe('family-room')
    expect(hashScreenToView('family-room')).toBe('family')
  })
})
