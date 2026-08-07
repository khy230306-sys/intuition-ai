import { describe, expect, it } from 'vitest'
import {
  buildAppHash,
  hashScreenToView,
  migratePathnameToHashUrl,
  parseLocationHash,
  sanitizeNavQuery,
  viewToHashScreen,
} from './hashRoute'

describe('sanitizeNavQuery', () => {
  it('strips javascript scheme', () => {
    expect(sanitizeNavQuery('javascript:alert(1)')).toBe('')
  })
  it('rejects html-looking payloads', () => {
    expect(sanitizeNavQuery('<img src=x onerror=alert(1)>')).toBe('')
  })
  it('handles bad percent encoding', () => {
    expect(sanitizeNavQuery('%E0%A4%A')).toBeTruthy()
  })
  it('truncates long query', () => {
    expect(sanitizeNavQuery('가'.repeat(500)).length).toBe(200)
  })
  it('keeps normal place names', () => {
    expect(sanitizeNavQuery('역삼동')).toBe('역삼동')
  })
  it('decodes encoded hangul', () => {
    expect(sanitizeNavQuery('%EC%97%AD%EC%82%BC%EB%8F%99')).toBe('역삼동')
  })
})

describe('parseLocationHash', () => {
  it('parses #navigation', () => {
    const r = parseLocationHash('#navigation')
    expect(r.valid).toBe(true)
    expect(r.screen).toBe('navigation')
    expect(r.query).toBe('')
  })
  it('parses #navigation?q=', () => {
    const r = parseLocationHash('#navigation?q=%EC%97%AD%EC%82%BC%EB%8F%99')
    expect(r.screen).toBe('navigation')
    expect(r.query).toBe('역삼동')
  })
  it('falls back invalid hash to home', () => {
    const r = parseLocationHash('#hacked')
    expect(r.valid).toBe(false)
    expect(r.screen).toBe('home')
  })
  it('supports home/chat/life/schedule/family/more/all', () => {
    for (const s of ['home', 'chat', 'life', 'schedule', 'family', 'more', 'all'] as const) {
      expect(parseLocationHash(`#${s}`).screen).toBe(s)
    }
  })
  it('empty hash is home', () => {
    expect(parseLocationHash('').screen).toBe('home')
  })
})

describe('buildAppHash', () => {
  it('builds navigation with query', () => {
    expect(buildAppHash('navigation', { query: '역삼동' })).toBe(
      `#navigation?q=${encodeURIComponent('역삼동')}`,
    )
  })
  it('builds home without query noise', () => {
    expect(buildAppHash('home', { query: 'x' })).toBe('#home')
  })
})

describe('view/hash mapping', () => {
  it('maps navigation view', () => {
    expect(viewToHashScreen('navigation')).toBe('navigation')
    expect(hashScreenToView('navigation')).toBe('navigation')
  })
  it('maps home and chat distinctly', () => {
    expect(viewToHashScreen('home')).toBe('home')
    expect(viewToHashScreen('chat')).toBe('chat')
    expect(hashScreenToView('home')).toBe('home')
    expect(hashScreenToView('chat')).toBe('chat')
  })
  it('maps all/more to more hub; life to schedule', () => {
    expect(hashScreenToView('all')).toBe('more')
    expect(hashScreenToView('more')).toBe('more')
    expect(hashScreenToView('life')).toBe('schedule')
    expect(viewToHashScreen('life')).toBe('schedule')
  })

  it('deep-links secondary screens (settings/games/travel/…)', () => {
    expect(parseLocationHash('#settings').valid).toBe(true)
    expect(hashScreenToView('settings')).toBe('settings')
    expect(viewToHashScreen('settings')).toBe('settings')
    expect(parseLocationHash('#games').screen).toBe('games')
    expect(hashScreenToView('games')).toBe('games')
    expect(parseLocationHash('#travel').screen).toBe('travel')
    expect(parseLocationHash('#restaurant').screen).toBe('restaurant')
    expect(parseLocationHash('#family-helper').valid).toBe(true)
    expect(hashScreenToView('family-helper')).toBe('family-helper')
    expect(hashScreenToView('family')).toBe('family-helper')
    expect(viewToHashScreen('family-helper')).toBe('family')
    expect(viewToHashScreen('family')).toBe('family-room')
    expect(hashScreenToView('family-room')).toBe('family')
  })
})

describe('pathname migration', () => {
  it('rewrites /navigation to /#navigation', () => {
    const next = migratePathnameToHashUrl('https://x.shipstatic.com/navigation')
    expect(next).toBe('https://x.shipstatic.com/#navigation')
  })
  it('preserves home query and moves q into hash', () => {
    const next = migratePathnameToHashUrl(
      'https://x.shipstatic.com/navigation?home=v2&q=%EC%97%AD%EC%82%BC%EB%8F%99',
    )
    expect(next).toContain('home=v2')
    expect(next).toContain('#navigation?q=')
    expect(next).not.toMatch(/\/navigation/)
  })
  it('rewrites /map', () => {
    expect(migratePathnameToHashUrl('https://x.shipstatic.com/map')).toBe(
      'https://x.shipstatic.com/#navigation',
    )
  })
  it('leaves root alone', () => {
    expect(migratePathnameToHashUrl('https://x.shipstatic.com/?home=v2')).toBeNull()
  })
})
