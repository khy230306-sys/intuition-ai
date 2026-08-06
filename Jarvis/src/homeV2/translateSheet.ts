/**
 * Dedicated HOME translate window (not interpret-lock / chat).
 * Uses in-app translateText (MyMemory + offline dict) — no invented text.
 */

import { LANGS } from '../translate'

export type TranslateSheetState = {
  sourceText: string
  /** 'auto' or MyMemory lang code */
  from: string
  to: string
  result: string
  status: string
  busy: boolean
  lastFrom?: string
  lastTo?: string
  offline?: boolean
}

/** Common targets for the sheet picker (full LANGS still used for labels). */
export const TRANSLATE_SHEET_PICKS: Array<{ code: string; label: string }> = [
  { code: 'auto', label: '자동 감지' },
  { code: 'ko', label: '한국어' },
  { code: 'en', label: '영어' },
  { code: 'ja', label: '일본어' },
  { code: 'zh-CN', label: '중국어' },
  { code: 'vi', label: '베트남어' },
  { code: 'es', label: '스페인어' },
  { code: 'fr', label: '프랑스어' },
  { code: 'de', label: '독일어' },
  { code: 'th', label: '태국어' },
  { code: 'id', label: '인도네시아어' },
  { code: 'ru', label: '러시아어' },
]

export function defaultTranslateSheetState(): TranslateSheetState {
  return {
    sourceText: '',
    from: 'auto',
    to: 'en',
    result: '',
    status: '번역할 문장을 입력하세요.',
    busy: false,
  }
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function optionsHtml(selected: string, includeAuto: boolean): string {
  const picks = includeAuto
    ? TRANSLATE_SHEET_PICKS
    : TRANSLATE_SHEET_PICKS.filter((p) => p.code !== 'auto')
  return picks
    .map(
      (p) =>
        `<option value="${esc(p.code)}" ${selected === p.code ? 'selected' : ''}>${esc(p.label)}</option>`,
    )
    .join('')
}

export function langNameForCode(code: string): string {
  if (code === 'auto') return '자동 감지'
  const hit = LANGS.find((l) => l.code === code)
  return hit?.name || code
}

export function renderTranslateSheet(st: TranslateSheetState): string {
  const resultBlock = st.result
    ? `<div class="home-v2-tr-result" data-tr-result="1">
        <p class="hint">${esc(st.lastFrom || '')} → ${esc(st.lastTo || '')}${st.offline ? ' · 오프라인' : ''}</p>
        <p class="home-v2-tr-out" id="tr-sheet-out">${esc(st.result)}</p>
        <div class="row-btns">
          <button type="button" class="ghost-btn" data-action="tr-sheet-copy">결과 복사</button>
          <button type="button" class="ghost-btn" data-action="tr-sheet-speak">읽어주기</button>
          <button type="button" class="ghost-btn" data-action="tr-sheet-clear-result">결과 지우기</button>
        </div>
      </div>`
    : ''

  return `
    <div class="home-v2-nav-sheet home-v2-tr-sheet" data-tr-sheet="1" role="dialog" aria-label="번역하기" aria-modal="true">
      <div class="home-v2-nav-sheet-panel home-v2-tr-panel">
        <div class="home-v2-more-head">
          <strong>번역하기</strong>
          <button type="button" class="ghost-btn tiny" data-action="tr-sheet-close">닫기</button>
        </div>
        <p class="hint">채팅과 별도 창입니다. 문장을 넣고 번역할 언어를 고르세요.</p>
        <form id="tr-sheet-form" class="home-v2-tr-form">
          <label class="home-v2-nav-label">원문
            <textarea id="tr-sheet-input" name="source" rows="4" maxlength="2000" placeholder="예: 안녕하세요 / Hello / こんにちは" ${st.busy ? 'disabled' : ''}>${esc(st.sourceText)}</textarea>
          </label>
          <div class="home-v2-tr-langs">
            <label class="home-v2-nav-label">원문 언어
              <select id="tr-sheet-from" name="from" ${st.busy ? 'disabled' : ''}>${optionsHtml(st.from, true)}</select>
            </label>
            <button type="button" class="ghost-btn tiny home-v2-tr-swap" data-action="tr-sheet-swap" aria-label="언어 바꾸기" ${st.busy ? 'disabled' : ''}>⇄</button>
            <label class="home-v2-nav-label">번역 언어
              <select id="tr-sheet-to" name="to" ${st.busy ? 'disabled' : ''}>${optionsHtml(st.to, false)}</select>
            </label>
          </div>
          <div class="row-btns">
            <button type="submit" class="primary-btn" ${st.busy ? 'disabled' : ''}>${st.busy ? '번역 중…' : '번역하기'}</button>
            <button type="button" class="ghost-btn" data-action="tr-sheet-clear" ${st.busy ? 'disabled' : ''}>입력 지우기</button>
          </div>
        </form>
        <p class="hint" data-tr-status="1">${esc(st.status)}</p>
        ${resultBlock}
      </div>
    </div>
  `
}
