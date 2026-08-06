import { describe, expect, it } from 'vitest'
import {
  defaultTranslateSheetState,
  langNameForCode,
  renderTranslateSheet,
  TRANSLATE_SHEET_PICKS,
} from './translateSheet'
import { HOME_V2_QUICK_COMMANDS } from './model'
import { renderHomeV2Shell } from './render'
import { buildHomeV2Model } from './model'

describe('HOME translate sheet', () => {
  it('registers translate quick command sentinel', () => {
    expect(HOME_V2_QUICK_COMMANDS.translate).toBe('__open_translate_sheet__')
  })

  it('renders dedicated translate dialog markup', () => {
    const html = renderTranslateSheet(defaultTranslateSheetState())
    expect(html).toContain('data-tr-sheet="1"')
    expect(html).toContain('aria-label="번역하기"')
    expect(html).toContain('id="tr-sheet-form"')
    expect(html).toContain('번역하기')
    expect(html).toContain('data-action="tr-sheet-close"')
    expect(html).toContain('data-action="tr-sheet-swap"')
    expect(TRANSLATE_SHEET_PICKS.some((p) => p.code === 'en')).toBe(true)
    expect(langNameForCode('ko')).toBe('한국어')
  })

  it('shows result actions when result present', () => {
    const html = renderTranslateSheet({
      ...defaultTranslateSheetState(),
      result: 'Hello',
      lastFrom: '한국어',
      lastTo: '영어',
      status: '번역 완료',
    })
    expect(html).toContain('data-tr-result="1"')
    expect(html).toContain('Hello')
    expect(html).toContain('data-action="tr-sheet-copy"')
    expect(html).toContain('data-action="tr-sheet-speak"')
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
      appVersion: '1.20.11',
      threadHtml: '<div></div>',
    })
    expect(html).toContain('data-quick-id="translate"')
    expect(html).toContain('번역하기')
    expect(html).toContain('별도 번역 창')
  })
})
