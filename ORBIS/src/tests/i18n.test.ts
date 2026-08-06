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

  it('contains Stage 2 modal copy', () => {
    expect(ko.modal.stage2Body).toContain('Stage 2')
    expect(en.modal.stage2Body).toContain('Stage 2')
  })
})
