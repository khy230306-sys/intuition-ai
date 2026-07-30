import type { ActionResult } from './types'

export interface QuickAction {
  id: string
  label: string
  icon: string
  run: () => ActionResult
}

function openUrl(url: string, label: string): ActionResult {
  try {
    window.open(url, '_blank')
    return { ok: true, message: `${label}을(를) 열었습니다.`, opened: url }
  } catch {
    return { ok: false, message: `${label}을(를) 열 수 없습니다.` }
  }
}

export type CopyTextNowOpts = {
  /** Prefer this already-visible input/textarea (iOS WebView-safe). */
  fromSelector?: string
}

function tryCopyFromField(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): boolean {
  const prev = el.value
  try {
    el.focus()
    // Only overwrite when the field is meant to hold this exact payload
    if (el.value !== value) el.value = value
    el.select?.()
    el.setSelectionRange?.(0, value.length)
    const ok = document.execCommand('copy')
    // Restore invite text box if we temporarily overwrote it
    if (el.classList.contains('invite-copy-box') && prev !== value) {
      el.value = prev
    }
    return !!ok
  } catch {
    if (el.classList.contains('invite-copy-box') && prev !== value) {
      try {
        el.value = prev
      } catch {
        /* ignore */
      }
    }
    return false
  }
}

/**
 * Synchronous copy for click/touch handlers.
 * iOS Safari / in-app WebViews often block async clipboard; keep this sync.
 */
export function copyTextNow(text: string, opts: CopyTextNowOpts = {}): ActionResult {
  const value = String(text ?? '')
  if (!value.trim()) return { ok: false, message: '복사할 내용이 없습니다.' }

  // 1) Visible invite field first (most reliable on iPhone / in-app browsers)
  if (opts.fromSelector) {
    const preferred = document.querySelector(opts.fromSelector) as HTMLInputElement | HTMLTextAreaElement | null
    if (preferred && tryCopyFromField(preferred, value)) {
      return { ok: true, message: '클립보드에 복사했습니다.' }
    }
  }

  // 2) iOS-friendly offscreen textarea (must be selectable, not display:none)
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.contentEditable = 'true'
    ta.readOnly = false
    ta.setAttribute('aria-hidden', 'true')
    // Keep in viewport — iOS ignores copies from opacity:0 / offscreen far away
    ta.style.cssText =
      'position:fixed;top:10px;left:10px;width:2em;height:2em;padding:0;margin:0;border:0;outline:none;opacity:0.01;z-index:99999;font-size:16px;'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, value.length)
    const sel = window.getSelection?.()
    if (sel) {
      sel.removeAllRanges()
      const range = document.createRange()
      range.selectNodeContents(ta)
      sel.addRange(range)
      ta.setSelectionRange(0, value.length)
    }
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return { ok: true, message: '클립보드에 복사했습니다.' }
  } catch {
    /* fall through */
  }

  // 3) Any visible invite field (do not leave code/link stuck in the text box)
  try {
    const boxes = [
      document.querySelector('[data-invite-select="code"]') as HTMLInputElement | null,
      document.querySelector('[data-invite-select="text"]') as HTMLTextAreaElement | null,
      document.querySelector('.invite-copy-box') as HTMLTextAreaElement | null,
    ].filter(Boolean) as Array<HTMLInputElement | HTMLTextAreaElement>
    for (const box of boxes) {
      if (tryCopyFromField(box, value)) {
        return { ok: true, message: '클립보드에 복사했습니다.' }
      }
    }
  } catch {
    /* fall through */
  }

  // 4) Clipboard API — only claim success if writeText is callable in this gesture.
  // Do NOT fire-and-forget: that previously showed «복사됨» when nothing was copied.
  try {
    if (navigator.clipboard?.writeText) {
      const p = navigator.clipboard.writeText(value)
      // Sync gesture path: if it returns a thenable we cannot await here without
      // losing the user gesture on some WebViews — mark as needs-share fallback.
      if (p && typeof (p as Promise<void>).then === 'function') {
        void (p as Promise<void>).catch(() => {
          /* async failure — UI already treated as fail below */
        })
        return { ok: false, message: '자동 복사 확인 불가 · 공유하기 또는 길게 눌러 복사하세요.' }
      }
      return { ok: true, message: '클립보드에 복사했습니다.' }
    }
  } catch {
    /* ignore */
  }

  return { ok: false, message: '자동 복사 불가 · 아래 문구를 길게 눌러 복사하거나 공유하기를 쓰세요.' }
}

/** After failed auto-copy: leave text selected in the visible box for long-press. */
export function selectVisibleInviteText(text: string): boolean {
  const box = document.querySelector('.invite-copy-box') as HTMLTextAreaElement | null
  if (!box) return false
  try {
    box.focus()
    box.value = text
    box.select()
    box.setSelectionRange(0, text.length)
    return true
  } catch {
    return false
  }
}

/** Async wrapper — prefers sync path so iOS click gestures stay valid. */
export async function copyText(text: string): Promise<ActionResult> {
  const sync = copyTextNow(text)
  if (sync.ok) return sync
  const value = String(text ?? '')
  if (!value.trim()) return sync
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return { ok: true, message: '클립보드에 복사했습니다.' }
    }
  } catch {
    /* ignore */
  }
  return sync
}

export type ShareTextOpts = {
  title?: string
  url?: string
}

/**
 * Prefer native share; on failure fall back to copy so invite codes are never lost.
 * iOS is more reliable with title (+ optional url).
 */
export async function shareText(text: string, opts: ShareTextOpts = {}): Promise<ActionResult> {
  const body = String(text ?? '').trim()
  if (!body) return { ok: false, message: '공유할 내용이 없습니다.' }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const data: ShareData = { text: body }
      if (opts.title) data.title = opts.title
      if (opts.url) data.url = opts.url
      await navigator.share(data)
      return { ok: true, message: '공유 시트를 열었습니다.' }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'AbortError') {
        const copied = await copyText(body)
        if (copied.ok) return { ok: true, message: '공유 취소 · 초대 문구를 복사해 두었습니다.' }
        return { ok: false, message: '공유가 취소되었습니다.' }
      }
      /* NotAllowedError / TypeError → copy below */
    }
  }

  const copied = await copyText(body)
  if (copied.ok) {
    return { ok: true, message: '공유 대신 초대 문구를 복사했습니다. 친구에게 붙여넣기 하세요.' }
  }
  return copied
}

export function openMaps(query: string): ActionResult {
  const q = encodeURIComponent(query.trim())
  return openUrl(`https://maps.apple.com/?q=${q}`, '지도')
}

export function openSearch(query: string): ActionResult {
  const q = encodeURIComponent(query.trim())
  return openUrl(`https://www.google.com/search?q=${q}`, '검색')
}

export function openTranslate(text: string, to = 'en'): ActionResult {
  const q = encodeURIComponent(text.trim())
  return openUrl(`https://translate.google.com/?sl=auto&tl=${to}&text=${q}&op=translate`, '번역')
}

export function openWeather(city = ''): ActionResult {
  const q = encodeURIComponent(city ? `${city} 날씨` : '날씨')
  return openUrl(`https://www.google.com/search?q=${q}`, '날씨')
}

export function callPhone(number: string): ActionResult {
  const cleaned = number.replace(/[^\d+]/g, '')
  if (!cleaned) return { ok: false, message: '전화번호를 알려주세요.' }
  return openUrl(`tel:${cleaned}`, '전화')
}

export function sendSms(number: string, body = ''): ActionResult {
  const cleaned = number.replace(/[^\d+]/g, '')
  if (!cleaned) return { ok: false, message: '전화번호를 알려주세요.' }
  const b = body ? `&body=${encodeURIComponent(body)}` : ''
  return openUrl(`sms:${cleaned}${b}`, '문자')
}

export function openMail(to: string, subject = '', body = ''): ActionResult {
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  const qs = params.toString()
  return openUrl(`mailto:${to}${qs ? `?${qs}` : ''}`, '메일')
}

const APP_SCHEMES: Record<string, { url: string; label: string }> = {
  유튜브: { url: 'youtube://', label: 'YouTube' },
  youtube: { url: 'youtube://', label: 'YouTube' },
  카카오: { url: 'kakaotalk://', label: '카카오톡' },
  카카오톡: { url: 'kakaotalk://', label: '카카오톡' },
  인스타: { url: 'instagram://', label: 'Instagram' },
  인스타그램: { url: 'instagram://', label: 'Instagram' },
  텔레그램: { url: 'tg://', label: 'Telegram' },
  telegram: { url: 'tg://', label: 'Telegram' },
  지도: { url: 'maps://', label: '지도' },
  설정: { url: 'App-prefs://', label: '설정' },
  카메라: { url: 'camera://', label: '카메라' },
  사진: { url: 'photos-redirect://', label: '사진' },
  음악: { url: 'music://', label: '음악' },
  사파리: { url: 'x-web-search://', label: 'Safari' },
  캘린더: { url: 'calshow://', label: '캘린더' },
  시계: { url: 'clock-alarm://', label: '시계' },
  메모: { url: 'mobilenotes://', label: '메모' },
  메시지: { url: 'sms:', label: '메시지' },
  전화: { url: 'tel://', label: '전화' },
}

export function openApp(name: string): ActionResult {
  const key = name.trim().toLowerCase()
  const found = Object.entries(APP_SCHEMES).find(([k]) => k.toLowerCase() === key || key.includes(k.toLowerCase()))
  if (!found) {
    return openSearch(`${name} 앱`)
  }
  return openUrl(found[1].url, found[1].label)
}

export function resolveAppIntent(text: string): ActionResult | null {
  const m = text.match(/(?:앱\s*열어|열어줘|실행해|켜줘)\s*(.+)$/i) || text.match(/^(.+?)\s*(?:앱\s*)?(?:열어줘|실행해|켜줘)$/i)
  if (!m) return null
  return openApp(m[1].replace(/앱/g, '').trim())
}

export const quickActions: QuickAction[] = [
  { id: 'yt', label: 'YouTube', icon: 'YT', run: () => openApp('유튜브') },
  { id: 'maps', label: '지도', icon: 'MAP', run: () => openUrl('maps://', '지도') },
  { id: 'kakao', label: '카카오톡', icon: 'TALK', run: () => openApp('카카오톡') },
  { id: 'weather', label: '날씨', icon: 'WX', run: () => openWeather() },
  { id: 'notes', label: '메모', icon: 'NOTE', run: () => openApp('메모') },
  { id: 'calendar', label: '캘린더', icon: 'CAL', run: () => openApp('캘린더') },
  { id: 'camera', label: '카메라', icon: 'CAM', run: () => openApp('카메라') },
  { id: 'settings', label: '설정', icon: 'SET', run: () => openApp('설정') },
  { id: 'search', label: '검색', icon: 'FIND', run: () => openSearch('') },
  { id: 'translate', label: '번역', icon: 'TR', run: () => openTranslate('Hello') },
  { id: 'phone', label: '전화', icon: 'TEL', run: () => openUrl('tel://', '전화') },
  { id: 'sms', label: '문자', icon: 'SMS', run: () => openUrl('sms:', '문자') },
]
