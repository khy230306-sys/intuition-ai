/**
 * Home-screen / PWA install helpers for browser visits.
 * Hide the CTA when already running as an installed app (iOS / Android).
 */

export type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'ios-chrome'

/** Shared Safari ↔ home-screen PWA storage — once seen as installed, hide CTA everywhere. */
export const PWA_INSTALLED_STORAGE_KEY = 'aizio.pwa.installed.v1'

/** Stable production host — prefer this for home-screen icons (preview hosts rotate). */
export const PRODUCTION_INSTALL_URL = 'https://jarvis-app.shipstatic.com'

export function isPreviewInstallHost(hostname = typeof location !== 'undefined' ? location.hostname : ''): boolean {
  const host = String(hostname || '').toLowerCase()
  if (!host) return false
  if (host === 'localhost' || host === '127.0.0.1') return true
  return host.endsWith('.shipstatic.com') && host !== 'jarvis-app.shipstatic.com'
}

/** URL to save on the home screen — production when browsing a preview snapshot. */
export function getRecommendedInstallUrl(
  hostname = typeof location !== 'undefined' ? location.hostname : '',
  origin = typeof location !== 'undefined' ? location.origin : '',
): string {
  if (isPreviewInstallHost(hostname)) return PRODUCTION_INSTALL_URL
  if (origin) return origin.replace(/\/$/, '')
  return PRODUCTION_INSTALL_URL
}

export function installCtaLabel(platform: InstallPlatform = detectInstallPlatform()): string {
  if (platform === 'ios' || platform === 'ios-chrome') return '설치 방법 보기'
  if (platform === 'android' && !hasNativeInstallPrompt()) return '설치 방법 보기'
  return '홈 화면에 설치'
}

let deferredPrompt: BeforeInstallPromptEventLike | null = null
let changeListeners: Array<() => void> = []

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

/** Persist that this origin has been installed / launched as a home-screen app. */
export function markPwaInstalled(store: StorageLike | null = storage()): void {
  try {
    store?.setItem(PWA_INSTALLED_STORAGE_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function clearPwaInstalledMark(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(PWA_INSTALLED_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasPwaInstalledMark(store: StorageLike | null = storage()): boolean {
  try {
    return store?.getItem(PWA_INSTALLED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function notifyChange(): void {
  for (const fn of changeListeners) {
    try {
      fn()
    } catch {
      /* ignore listener errors */
    }
  }
}

/** True when opened from a home-screen / installed PWA icon. */
export function isRunningAsInstalledPwa(
  win: Pick<Window, 'matchMedia'> & { navigator: Navigator; document?: Document } = window,
): boolean {
  try {
    const modes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'] as const
    for (const mode of modes) {
      if (win.matchMedia(`(display-mode: ${mode})`).matches) return true
    }
  } catch {
    /* ignore */
  }
  const nav = win.navigator as Navigator & { standalone?: boolean }
  if (typeof nav.standalone === 'boolean' && nav.standalone) return true
  try {
    const ref = win.document?.referrer || ''
    if (ref.startsWith('android-app://')) return true
  } catch {
    /* ignore */
  }
  return false
}

/** Chrome / Firefox / in-app browsers on iOS — cannot use Safari A2HS APIs. */
export function isIosNonSafari(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  if (!/iPad|iPhone|iPod/i.test(ua) && !(typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return false
  }
  return /CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//i.test(ua)
}

export function detectInstallPlatform(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InstallPlatform {
  const iOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1)
  if (iOS) return isIosNonSafari(ua) ? 'ios-chrome' : 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Phones/tablets where “홈 화면에 추가” is the main path. */
export function isMobileInstallTarget(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  const p = detectInstallPlatform(ua)
  if (p === 'ios' || p === 'ios-chrome' || p === 'android') return true
  if (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true
  }
  return false
}

export function hasNativeInstallPrompt(): boolean {
  return deferredPrompt != null
}

/**
 * Show the install button only when the user is in a browser tab
 * (not already launched from the home-screen icon, and not previously marked installed).
 */
export function shouldShowInstallButton(
  win: Pick<Window, 'matchMedia'> & { navigator: Navigator; document?: Document } = window,
  store: StorageLike | null = storage(),
): boolean {
  if (isRunningAsInstalledPwa(win)) {
    markPwaInstalled(store)
    return false
  }
  if (hasPwaInstalledMark(store)) return false
  const ua = win.navigator.userAgent
  return isMobileInstallTarget(ua) || deferredPrompt != null
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEventLike | null {
  return deferredPrompt
}

export function setDeferredInstallPromptForTests(ev: BeforeInstallPromptEventLike | null): void {
  deferredPrompt = ev
}

export function onPwaInstallChange(fn: () => void): () => void {
  changeListeners.push(fn)
  return () => {
    changeListeners = changeListeners.filter((x) => x !== fn)
  }
}

/** Call once at boot (browser only). */
export function bindPwaInstallEvents(): void {
  if (typeof window === 'undefined') return
  // Home-screen launch shares localStorage with Safari — remember and hide banner later.
  if (isRunningAsInstalledPwa()) markPwaInstalled()
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEventLike
    notifyChange()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    markPwaInstalled()
    notifyChange()
  })
  try {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMode = () => {
      if (mq.matches) markPwaInstalled()
      notifyChange()
    }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMode)
    else if (typeof mq.addListener === 'function') mq.addListener(onMode)
  } catch {
    /* ignore */
  }
}

export type InstallAttemptResult =
  | { kind: 'accepted' }
  | { kind: 'dismissed' }
  | { kind: 'need-guide'; platform: InstallPlatform }
  | { kind: 'already-installed' }
  | { kind: 'unavailable' }

/** Try native install sheet; otherwise caller should show the step-by-step guide. */
export async function attemptPwaInstall(): Promise<InstallAttemptResult> {
  if (typeof window !== 'undefined' && isRunningAsInstalledPwa()) {
    markPwaInstalled()
    return { kind: 'already-installed' }
  }
  if (hasPwaInstalledMark()) {
    return { kind: 'already-installed' }
  }
  // Wait briefly for SW / beforeinstallprompt on Chromium Android after first visit
  if (!deferredPrompt && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((r) => setTimeout(r, 800)),
      ])
    } catch {
      /* ignore */
    }
  }
  const promptEvent = deferredPrompt
  if (promptEvent) {
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      deferredPrompt = null
      if (choice.outcome === 'accepted') markPwaInstalled()
      notifyChange()
      return choice.outcome === 'accepted' ? { kind: 'accepted' } : { kind: 'dismissed' }
    } catch {
      deferredPrompt = null
      notifyChange()
      return { kind: 'need-guide', platform: detectInstallPlatform() }
    }
  }
  return { kind: 'need-guide', platform: detectInstallPlatform() }
}

export function installGuideSteps(platform: InstallPlatform, opts?: { previewHost?: boolean }): { title: string; steps: string[] } {
  const previewNote = opts?.previewHost
    ? '지금 보시는 주소는 Preview입니다. 홈 화면에는 정식 주소(jarvis-app.shipstatic.com)를 추가하세요.'
    : ''
  if (platform === 'ios-chrome') {
    return {
      title: '홈 화면에 추가 (Safari 필요)',
      steps: [
        '아이폰에서는 Chrome/인앱 브라우저로는 설치가 안 됩니다. Safari가 필요합니다.',
        previewNote || '아래 「정식 주소 복사」를 누릅니다.',
        'Safari를 연 뒤 주소창에 붙여넣어 AIZIO를 엽니다.',
        'Safari 하단 공유(□↑) → 목록을 아래로 스크롤 → 「홈 화면에 추가」.',
        '없으면 「편집」/「동작 편집」에서 「홈 화면에 추가」를 켠 뒤 다시 시도하세요.',
        '오른쪽 위 「추가」→ 홈 화면 AIZIO 아이콘으로 실행 (주소창이 없어야 정상).',
      ].filter(Boolean),
    }
  }
  if (platform === 'ios') {
    return {
      title: '아이폰 · Safari로 홈 화면에 추가',
      steps: [
        '앱 안의 「설치」버튼은 아이폰에서 바로 설치하지 않습니다. Safari 공유가 필요합니다.',
        previewNote || '가능하면 정식 주소(jarvis-app.shipstatic.com)에서 추가하세요.',
        'Safari 하단(또는 상단) 공유 버튼(□↑)을 누릅니다.',
        '시트를 아래로 스크롤해 「홈 화면에 추가」를 고릅니다. (위쪽에 「즐겨찾기」만 보이면 더 아래로)',
        '목록에 없으면 「편집」또는 「동작 편집」→ 「홈 화면에 추가」켜기 → 완료 후 다시 공유.',
        '오른쪽 위 「추가」를 누릅니다. 개인정보 보호 브라우징이면 일반 탭으로 바꿔 다시 시도하세요.',
        '홈 화면 AIZIO 아이콘으로 실행하면 주소창이 사라지고 이 안내는 숨겨집니다.',
      ].filter(Boolean),
    }
  }
  if (platform === 'android') {
    return {
      title: '안드로이드 · 홈 화면에 설치',
      steps: [
        'Chrome 메뉴(⋮)를 엽니다.',
        '「앱 설치」또는 「홈 화면에 추가」를 누릅니다.',
        '설치를 확인하면 홈 화면에 AIZIO 아이콘이 생깁니다.',
        '아이콘으로 실행하면 설치 버튼은 자동으로 숨겨집니다.',
      ],
    }
  }
  return {
    title: '홈 화면에 설치',
    steps: [
      '주소창 오른쪽의 설치 아이콘이 있으면 눌러 주세요.',
      '또는 브라우저 메뉴에서 「앱 설치」/「Install app」을 선택하세요.',
      '설치 후에는 이 버튼이 표시되지 않습니다.',
    ],
  }
}

async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (!text) return false
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/** Copy current page URL (legacy). Prefer copyRecommendedInstallUrl for A2HS. */
export async function copyAppUrl(): Promise<boolean> {
  const url =
    typeof location !== 'undefined' ? `${location.origin}${location.pathname || '/'}`.replace(/\/$/, '/') : ''
  return writeClipboardText(url || PRODUCTION_INSTALL_URL)
}

/** Copy the URL that should be saved on the home screen. */
export async function copyRecommendedInstallUrl(): Promise<{ ok: boolean; url: string }> {
  const url = getRecommendedInstallUrl()
  return { ok: await writeClipboardText(url), url }
}
