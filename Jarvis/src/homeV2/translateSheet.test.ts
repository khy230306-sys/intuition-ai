import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectLangCode } from '../translate'
import {
  defaultSpeakLang,
  defaultTranslateSheetState,
  langNameForCode,
  loadStoredSpeakLang,
  renderTranslateSheet,
  resolveTranslateSheetFrom,
  saveStoredSpeakLang,
  sttLangForTranslateSheet,
  TRANSLATE_SPEAK_CHIPS,
  TRANSLATE_SHEET_PICKS,
} from './translateSheet'
import { HOME_V2_QUICK_COMMANDS } from './model'
import { renderHomeV2Shell } from './render'
import { buildHomeV2Model } from './model'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
})

describe('HOME translate sheet', () => {
  beforeEach(() => store.clear())

  it('registers translate quick command sentinel', () => {
    expect(HOME_V2_QUICK_COMMANDS.translate).toBe('__open_translate_sheet__')
  })

  it('renders speak-language chips and MIC', () => {
    const html = renderTranslateSheet(defaultTranslateSheetState())
    expect(html).toContain('data-tr-sheet="1"')
    expect(html).toContain('data-action="tr-sheet-mic"')
    expect(html).toContain('data-action="tr-sheet-speak-lang"')
    expect(html).toContain('data-speak-lang="vi"')
    expect(html).toContain('data-speak-lang="ja"')
    expect(html).toContain('말할 언어')
    expect(TRANSLATE_SHEET_PICKS.some((p) => p.code === 'en')).toBe(true)
    expect(TRANSLATE_SPEAK_CHIPS.length).toBeGreaterThanOrEqual(10)
    expect(langNameForCode('ko')).toBe('한국어')
  })

  it('marks active speak chip', () => {
    const html = renderTranslateSheet({
      ...defaultTranslateSheetState(),
      speakLang: 'vi',
      to: 'ko',
    })
    expect(html).toMatch(/data-speak-lang="vi"[^>]*aria-pressed="true"/)
    expect(html).toContain('베트남어')
  })

  it('MIC path trusts speakLang over weak Latin detect', () => {
    // "Come on" script-detects as English, but if user spoke Vietnamese STT locale…
    expect(resolveTranslateSheetFrom('Come on', 'auto', { speakLang: 'en', inputSource: 'mic' })).toBe(
      'en',
    )
    expect(resolveTranslateSheetFrom('Xin chào', 'auto', { speakLang: 'vi', inputSource: 'mic' })).toBe(
      'vi',
    )
    expect(resolveTranslateSheetFrom('こんにちは', 'auto', { speakLang: 'ja', inputSource: 'mic' })).toBe(
      'ja',
    )
    // Typed auto still uses script detection
    expect(resolveTranslateSheetFrom('안녕하세요', 'auto', { inputSource: 'type' })).toBe('ko')
    expect(resolveTranslateSheetFrom('Hello', 'ja')).toBe('ja')
  })

  it('STT locale follows speak chip (world languages)', () => {
    expect(sttLangForTranslateSheet('vi')).toBe('vi-VN')
    expect(sttLangForTranslateSheet('ja')).toBe('ja-JP')
    expect(sttLangForTranslateSheet('zh-CN')).toBe('zh-CN')
    expect(sttLangForTranslateSheet('en')).toBe('en-US')
    expect(sttLangForTranslateSheet('ko')).toBe('ko-KR')
    expect(sttLangForTranslateSheet('ar')).toBe('ar-SA')
  })

  it('defaultSpeakLang prefers stored then opposite of target', () => {
    expect(defaultSpeakLang('ko', null)).toBe('en')
    expect(defaultSpeakLang('en', null)).toBe('ko')
    expect(defaultSpeakLang('vi', null)).toBe('ko')
    expect(defaultSpeakLang('ko', 'ja')).toBe('ja')
  })

  it('persists speak language choice', () => {
    saveStoredSpeakLang('vi')
    expect(loadStoredSpeakLang()).toBe('vi')
  })

  it('detectLangCode recognizes Vietnamese tone marks', () => {
    expect(detectLangCode('Xin chào')).toBe('vi')
    expect(detectLangCode('こんにちは')).toBe('ja')
    expect(detectLangCode('안녕하세요')).toBe('ko')
  })

  it('shows result actions when result present', () => {
    const html = renderTranslateSheet({
      ...defaultTranslateSheetState(),
      result: '화이팅',
      lastFrom: '영어(음성)',
      lastTo: '한국어',
      status: '영어(음성) → 한국어 · 번역 완료',
      speakLang: 'en',
    })
    expect(html).toContain('data-tr-result="1"')
    expect(html).toContain('화이팅')
    expect(html).toContain('영어(음성)')
  })

  it('includes 번역하기 on HOME v2 quick row', () => {
    const model = buildHomeV2Model({
      listening: false,
      busy: false,
    })
    const html = renderHomeV2Shell(model, {
      draft: '',
      busy: false,
      listening: false,
      appVersion: '1.20.15',
      threadHtml: '<div></div>',
    })
    expect(html).toContain('data-quick-id="translate"')
    expect(html).toContain('번역하기')
  })
})
