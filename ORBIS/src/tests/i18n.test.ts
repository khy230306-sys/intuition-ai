import { describe, expect, it } from 'vitest'
import { en } from '../i18n/locales/en'
import { ko } from '../i18n/locales/ko'

function collectKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('i18n dictionaries', () => {
  it('keeps Korean and English keys aligned', () => {
    expect(collectKeys(en).sort()).toEqual(collectKeys(ko).sort())
  })

  it('contains CORE TRINITY copy', () => {
    expect(ko.play.openCore).toBe('CORE 열기')
    expect(en.play.openCore).toBe('Open CORE')
    expect(ko.play.void).toBe('VOID')
    expect(en.nav.play).toBe('Trinity')
  })
})
