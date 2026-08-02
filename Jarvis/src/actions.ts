import type { ActionResult, View } from './types'

export interface QuickAction {
  id: string
  label: string
  icon: string
  run: () => ActionResult
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * iOS Safari / home-screen PWA-safe open.
 * Custom schemes must use an <a> click (not window.open) inside the user gesture.
 */
export function navigateHref(url: string, opts: { newTab?: boolean } = {}): boolean {
  try {
    const a = document.createElement('a')
    a.href = url
    a.rel = 'noopener noreferrer'
    if (opts.newTab ?? isHttpUrl(url)) a.target = '_blank'
    a.style.cssText = 'display:none;position:fixed;left:0;top:0;width:1px;height:1px;opacity:0'
    document.body.appendChild(a)
    a.click()
    window.setTimeout(() => {
      try {
        a.remove()
      } catch {
        /* ignore */
      }
    }, 0)
    return true
  } catch {
    return false
  }
}

export function openUrl(url: string, label: string): ActionResult {
  const ok = navigateHref(url, { newTab: isHttpUrl(url) })
  return ok
    ? { ok: true, message: `${label}을(를) 열었습니다.`, opened: url }
    : { ok: false, message: `${label}을(를) 열 수 없습니다.` }
}

/** Prefer native app scheme; always keep a working HTTPS (or in-app) fallback. */
export function openAppOrWeb(appUrl: string, webUrl: string | null, label: string): ActionResult {
  if (appUrl) navigateHref(appUrl, { newTab: false })
  if (webUrl) return openUrl(webUrl, label)
  return {
    ok: true,
    message: `${label} 앱을 실행했습니다. 열리지 않으면 해당 앱 설치 여부를 확인해 주세요.`,
    opened: appUrl,
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

export function openMaps(query = ''): ActionResult {
  const q = query.trim()
  // Universal HTTPS opens Apple Maps app when installed on iPhone.
  const url = q ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : 'https://maps.apple.com/'
  navigateHref('maps://', { newTab: false })
  return openUrl(url, '지도')
}

export function openSearch(query: string): ActionResult {
  const trimmed = query.trim()
  if (!trimmed) return openUrl('https://www.google.com/', '검색')
  return openUrl(`https://www.google.com/search?q=${encodeURIComponent(trimmed)}`, '검색')
}

export function openTranslate(text = '', to = 'en'): ActionResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return openUrl(`https://translate.google.com/?sl=auto&tl=${to}&op=translate`, '번역')
  }
  return openUrl(
    `https://translate.google.com/?sl=auto&tl=${to}&text=${encodeURIComponent(trimmed)}&op=translate`,
    '번역',
  )
}

export function openWeather(city = ''): ActionResult {
  const q = encodeURIComponent(city ? `${city} 날씨` : '날씨')
  return openUrl(`https://www.google.com/search?q=${q}`, '날씨')
}

export function callPhone(number = ''): ActionResult {
  const cleaned = number.replace(/[^\d+]/g, '')
  // Empty tel: opens the Phone dialer on iOS.
  return openUrl(cleaned ? `tel:${cleaned}` : 'tel:', '전화')
}

export function sendSms(number = '', body = ''): ActionResult {
  const cleaned = number.replace(/[^\d+]/g, '')
  if (!cleaned) return openUrl('sms:', '문자')
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

/** Open device camera via capture file input (camera:// is not a public iOS scheme). */
export function openCamera(): ActionResult {
  try {
    let input = document.getElementById('jarvis-camera-input') as HTMLInputElement | null
    if (!input) {
      input = document.createElement('input')
      input.id = 'jarvis-camera-input'
      input.type = 'file'
      input.accept = 'image/*'
      input.setAttribute('capture', 'environment')
      input.style.cssText = 'display:none;position:fixed;width:0;height:0;opacity:0'
      input.addEventListener('change', () => {
        input!.value = ''
      })
      document.body.appendChild(input)
    }
    input.click()
    return { ok: true, message: '카메라를 엽니다. 촬영 후 사진을 선택할 수 있습니다.' }
  } catch {
    return {
      ok: false,
      message: '카메라를 열 수 없습니다. 홈 화면에서 카메라 앱을 사용해 주세요.',
    }
  }
}

export function openJarvisSettings(): ActionResult {
  return {
    ok: true,
    message: 'JARVIS 설정으로 이동합니다.',
    view: 'settings' as View,
  }
}

type AppLaunch = { app?: string; web?: string | null; label: string; special?: 'camera' | 'settings' }

const APP_LAUNCH: Record<string, AppLaunch> = {
  유튜브: { app: 'youtube://', web: 'https://www.youtube.com', label: 'YouTube' },
  youtube: { app: 'youtube://', web: 'https://www.youtube.com', label: 'YouTube' },
  카카오: { app: 'kakaotalk://', web: null, label: '카카오톡' },
  카카오톡: { app: 'kakaotalk://', web: null, label: '카카오톡' },
  인스타: { app: 'instagram://', web: 'https://www.instagram.com', label: 'Instagram' },
  인스타그램: { app: 'instagram://', web: 'https://www.instagram.com', label: 'Instagram' },
  텔레그램: { app: 'tg://', web: 'https://web.telegram.org', label: 'Telegram' },
  telegram: { app: 'tg://', web: 'https://web.telegram.org', label: 'Telegram' },
  지도: { web: 'https://maps.apple.com/', label: '지도' },
  설정: { special: 'settings', label: '설정' },
  카메라: { special: 'camera', label: '카메라' },
  사진: { app: 'photos-redirect://', web: null, label: '사진' },
  음악: { app: 'music://', web: 'https://music.apple.com', label: '음악' },
  사파리: { web: 'https://www.google.com', label: 'Safari' },
  캘린더: { app: 'calshow://', web: null, label: '캘린더' },
  시계: { app: 'clock-alarm://', web: null, label: '시계' },
  메모: { app: 'mobilenotes://', web: null, label: '메모' },
  메시지: { app: 'sms:', web: null, label: '메시지' },
  전화: { app: 'tel:', web: null, label: '전화' },
}

export function openApp(name: string): ActionResult {
  const key = name.trim().toLowerCase()
  const found = Object.entries(APP_LAUNCH).find(
    ([k]) => k.toLowerCase() === key || key.includes(k.toLowerCase()),
  )
  if (!found) return openSearch(`${name} 앱`)
  const launch = found[1]
  if (launch.special === 'camera') return openCamera()
  if (launch.special === 'settings') return openJarvisSettings()
  if (launch.app && launch.web) return openAppOrWeb(launch.app, launch.web, launch.label)
  if (launch.app) return openAppOrWeb(launch.app, null, launch.label)
  if (launch.web) return openUrl(launch.web, launch.label)
  return { ok: false, message: `${launch.label}을(를) 열 수 없습니다.` }
}

export function resolveAppIntent(text: string): ActionResult | null {
  const m =
    text.match(/(?:앱\s*열어|열어줘|실행해|켜줘)\s*(.+)$/i) ||
    text.match(/^(.+?)\s*(?:앱\s*)?(?:열어줘|실행해|켜줘)$/i)
  if (!m) return null
  return openApp(m[1].replace(/앱/g, '').trim())
}

function promptText(message: string): string | null {
  try {
    const v = window.prompt(message)
    return v == null ? null : v
  } catch {
    return null
  }
}

export const quickActions: QuickAction[] = [
  {
    id: 'yt',
    label: 'YouTube',
    icon: 'YT',
    run: () => openAppOrWeb('youtube://', 'https://www.youtube.com', 'YouTube'),
  },
  { id: 'maps', label: '지도', icon: 'MAP', run: () => openMaps() },
  {
    id: 'kakao',
    label: '카카오톡',
    icon: 'TALK',
    run: () => openAppOrWeb('kakaotalk://', null, '카카오톡'),
  },
  { id: 'weather', label: '날씨', icon: 'WX', run: () => openWeather() },
  {
    id: 'notes',
    label: '메모',
    icon: 'NOTE',
    run: () => openAppOrWeb('mobilenotes://', null, '메모'),
  },
  {
    id: 'calendar',
    label: '캘린더',
    icon: 'CAL',
    run: () => openAppOrWeb('calshow://', null, '캘린더'),
  },
  { id: 'camera', label: '카메라', icon: 'CAM', run: () => openCamera() },
  { id: 'settings', label: '설정', icon: 'SET', run: () => openJarvisSettings() },
  {
    id: 'search',
    label: '검색',
    icon: 'FIND',
    run: () => {
      const q = promptText('검색어를 입력하세요')
      if (q === null) return { ok: false, message: '검색을 취소했습니다.' }
      return openSearch(q)
    },
  },
  {
    id: 'translate',
    label: '번역',
    icon: 'TR',
    run: () => {
      const q = promptText('번역할 문장을 입력하세요 (비우면 번역 페이지)')
      if (q === null) return { ok: false, message: '번역을 취소했습니다.' }
      return openTranslate(q)
    },
  },
  {
    id: 'phone',
    label: '전화',
    icon: 'TEL',
    run: () => {
      const n = promptText('전화번호 (비우면 전화 앱)')
      if (n === null) return { ok: false, message: '전화를 취소했습니다.' }
      return callPhone(n)
    },
  },
  {
    id: 'sms',
    label: '문자',
    icon: 'SMS',
    run: () => {
      const n = promptText('문자 받을 번호 (비우면 메시지 앱)')
      if (n === null) return { ok: false, message: '문자를 취소했습니다.' }
      return sendSms(n)
    },
  },
]
