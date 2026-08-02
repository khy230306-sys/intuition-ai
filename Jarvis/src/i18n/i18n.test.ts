import { describe, expect, it } from 'vitest'
import { detectAppLocale, normalizeAppLocale, t, setAppLocale, initAppLocale } from './index'

describe('i18n', () => {
  it('normalizes locale codes', () => {
    expect(normalizeAppLocale('ko-KR')).toBe('ko')
    expect(normalizeAppLocale('ja')).toBe('ja')
    expect(normalizeAppLocale('vi-VN')).toBe('vi')
    expect(normalizeAppLocale('fr-FR')).toBe(null)
  })

  it('falls back for unsupported browser language', () => {
    expect(detectAppLocale(null, 'en')).toBeTruthy()
  })

  it('switches UI strings', () => {
    setAppLocale('en')
    expect(t('nav.settings')).toBe('Settings')
    setAppLocale('ja')
    expect(t('nav.family')).toBe('家族')
    setAppLocale('vi')
    expect(t('common.send')).toBe('Gửi')
    initAppLocale('ko')
    expect(t('nav.chat')).toBe('대화')
  })
})
