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

  it('contains ALIGN skill copy', () => {
    expect(ko.play.startAlign).toBe('정렬 시작')
    expect(en.play.startAlign).toBe('Start Align')
    expect(ko.nav.play).toBe('정렬')
    expect(en.nav.play).toBe('Align')
  })
})
