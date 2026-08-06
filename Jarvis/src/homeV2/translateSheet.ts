/**
 * Dedicated HOME translate window (not interpret-lock / chat).
 * Uses in-app translateText (MyMemory + offline dict) — no invented text.
 *
 * MIC + 자동 감지:
 * - SpeechRecognition needs an explicit locale (browser limitation).
 * - 「말할 언어」chips pick the STT locale (world languages).
 * - Transcript is then translated into 「번역 언어」.
 * - Typed text with 원문=자동 감지 still uses script/heuristics detectLangCode.
 */

import { LANGS, bcp47, detectLangCode } from '../translate'

export type TranslateSheetState = {
  sourceText: string
  /** 'auto' or MyMemory lang code — used for typed translate / display */
  from: string
  to: string
  /**
   * Language the user will SPEAK into MIC (STT locale).
   * Required for reliable world-language recognition.
   */
  speakLang: string
  result: string
  status: string
  busy: boolean
  lastFrom?: string
  lastTo?: string
  offline?: boolean
  /** How source was filled: mic | type */
  lastInputSource?: 'mic' | 'type'
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

/** World-language chips for MIC STT (browser SpeechRecognition locales). */
export const TRANSLATE_SPEAK_CHIPS: Array<{ code: string; label: string; short: string }> = [
  { code: 'ko', label: '한국어', short: '한' },
  { code: 'en', label: '영어', short: 'EN' },
  { code: 'ja', label: '일본어', short: '日' },
  { code: 'zh-CN', label: '중국어', short: '中' },
  { code: 'vi', label: '베트남어', short: 'VI' },
  { code: 'es', label: '스페인어', short: 'ES' },
  { code: 'fr', label: '프랑스어', short: 'FR' },
  { code: 'de', label: '독일어', short: 'DE' },
  { code: 'th', label: '태국어', short: 'TH' },
  { code: 'id', label: '인도네시아어', short: 'ID' },
  { code: 'ru', label: '러시아어', short: 'RU' },
  { code: 'pt', label: '포르투갈어', short: 'PT' },
  { code: 'it', label: '이탈리아어', short: 'IT' },
  { code: 'ar', label: '아랍어', short: 'AR' },
  { code: 'hi', label: '힌디어', short: 'HI' },
]

const SPEAK_LANG_KEY = 'aizio.translateSheet.speakLang.v1'

export function loadStoredSpeakLang(): string | null {
  try {
    const v = localStorage.getItem(SPEAK_LANG_KEY)
    if (v && TRANSLATE_SPEAK_CHIPS.some((c) => c.code === v)) return v
  } catch {
    /* ignore */
  }
  return null
}

export function saveStoredSpeakLang(code: string): void {
  try {
    if (TRANSLATE_SPEAK_CHIPS.some((c) => c.code === code)) {
      localStorage.setItem(SPEAK_LANG_KEY, code)
    }
  } catch {
    /* ignore */
  }
}

/** Default speak lang: last used, else opposite of target (ko↔en), else Korean. */
export function defaultSpeakLang(to: string, stored?: string | null): string {
  if (stored && TRANSLATE_SPEAK_CHIPS.some((c) => c.code === stored)) return stored
  const t = (to || 'en').trim()
  if (t === 'ko') return 'en'
  if (t === 'en') return 'ko'
  return 'ko'
}

export function defaultTranslateSheetState(): TranslateSheetState {
  const to = 'en'
  return {
    sourceText: '',
    from: 'auto',
    to,
    speakLang: defaultSpeakLang(to, typeof localStorage !== 'undefined' ? loadStoredSpeakLang() : null),
    result: '',
    status: '말할 언어를 고른 뒤 MIC를 누르거나, 문장을 입력하세요.',
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
  if (hit) return hit.name
  const chip = TRANSLATE_SPEAK_CHIPS.find((c) => c.code === code)
  return chip?.label || code
}

/**
 * STT locale for sheet MIC.
 * Always uses explicit speakLang (world-language chip) — never guesses from target alone.
 */
export function sttLangForTranslateSheet(speakLang: string, from?: string, _to?: string): string {
  const speak = (speakLang || '').trim()
  if (speak && speak !== 'auto') return bcp47(speak)
  const f = (from || '').trim()
  if (f && f !== 'auto') return bcp47(f)
  return 'ko-KR'
}

/**
 * Resolve MyMemory `from` code.
 * - Picker fixed language → that code
 * - MIC path with speakLang → trust STT locale (most accurate for Latin scripts)
 * - Else script/heuristic detectLangCode
 */
export function resolveTranslateSheetFrom(
  text: string,
  fromPicker: string,
  opts?: { speakLang?: string; inputSource?: 'mic' | 'type' },
): string {
  const f = (fromPicker || 'auto').trim()
  if (f && f !== 'auto') return f
  if (opts?.inputSource === 'mic' && opts.speakLang && opts.speakLang !== 'auto') {
    return opts.speakLang
  }
  return detectLangCode(text)
}

export function renderTranslateSheet(
  st: TranslateSheetState,
  opts?: { listening?: boolean; voiceHint?: string },
): string {
  const listening = Boolean(opts?.listening)
  const hint = opts?.voiceHint || ''
  const speak = st.speakLang || defaultSpeakLang(st.to)
  const chips = TRANSLATE_SPEAK_CHIPS.map(
    (c) =>
      `<button type="button" class="home-v2-tr-speak-chip ${speak === c.code ? 'active' : ''}" data-action="tr-sheet-speak-lang" data-speak-lang="${esc(c.code)}" aria-pressed="${speak === c.code ? 'true' : 'false'}" ${st.busy || listening ? 'disabled' : ''} title="${esc(c.label)}">${esc(c.short)}</button>`,
  ).join('')

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
        <p class="hint">MIC는 브라우저가 <strong>말할 언어</strong>를 알아야 세계 언어를 정확히 듣습니다. 칩을 고른 뒤 MIC → 설정한 <strong>번역 언어</strong>로 바로 번역합니다.</p>
        <div class="home-v2-tr-speak-block">
          <p class="home-v2-tr-speak-label">말할 언어 · ${esc(langNameForCode(speak))}</p>
          <div class="home-v2-tr-speak-chips" role="group" aria-label="말할 언어 선택">${chips}</div>
        </div>
        <form id="tr-sheet-form" class="home-v2-tr-form">
          <label class="home-v2-nav-label">원문
            <textarea id="tr-sheet-input" name="source" rows="4" maxlength="2000" placeholder="예: 안녕하세요 / Hello / Xin chào / こんにちは" ${st.busy || listening ? 'disabled' : ''}>${esc(st.sourceText)}</textarea>
          </label>
          <div class="home-v2-tr-langs">
            <label class="home-v2-nav-label">원문 언어 (입력 텍스트)
              <select id="tr-sheet-from" name="from" ${st.busy || listening ? 'disabled' : ''}>${optionsHtml(st.from, true)}</select>
            </label>
            <button type="button" class="ghost-btn tiny home-v2-tr-swap" data-action="tr-sheet-swap" aria-label="언어 바꾸기" ${st.busy || listening ? 'disabled' : ''}>⇄</button>
            <label class="home-v2-nav-label">번역 언어
              <select id="tr-sheet-to" name="to" ${st.busy || listening ? 'disabled' : ''}>${optionsHtml(st.to, false)}</select>
            </label>
          </div>
          <div class="row-btns home-v2-tr-actions">
            <button type="button" class="icon-btn ${listening ? 'listening' : ''}" data-action="tr-sheet-mic" aria-label="음성으로 번역" aria-pressed="${listening ? 'true' : 'false'}" ${st.busy ? 'disabled' : ''}>${listening ? 'STOP' : 'MIC'}</button>
            <button type="submit" class="primary-btn" ${st.busy || listening ? 'disabled' : ''}>${st.busy ? '번역 중…' : '번역하기'}</button>
            <button type="button" class="ghost-btn" data-action="tr-sheet-clear" ${st.busy || listening ? 'disabled' : ''}>입력 지우기</button>
          </div>
        </form>
        <p class="hint ${listening ? 'live' : ''}" data-tr-status="1" id="tr-sheet-status">${esc(
          listening ? hint || `${langNameForCode(speak)}로 듣는 중…` : st.status,
        )}</p>
        ${resultBlock}
      </div>
    </div>
  `
}
