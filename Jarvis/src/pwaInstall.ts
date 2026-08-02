/**
 * Home-screen / PWA install helpers for browser visits.
 * Hide the CTA when already running as an installed app (iOS / Android).
 */

export type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

let deferredPrompt: BeforeInstallPromptEventLike | null = null
let changeListeners: Array<() => void> = []

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

export function detectInstallPlatform(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InstallPlatform {
  const iOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Phones/tablets where “홈 화면에 추가” is the main path. */
export function isMobileInstallTarget(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  const p = detectInstallPlatform(ua)
  if (p === 'ios' || p === 'android') return true
  // iPadOS desktop UA
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
 * (not already launched from the home-screen icon).
 */
export function shouldShowInstallButton(
  win: Pick<Window, 'matchMedia'> & { navigator: Navigator; document?: Document } = window,
): boolean {
  if (isRunningAsInstalledPwa(win)) return false
  const ua = win.navigator.userAgent
  // Mobile always; desktop only if Chromium offered beforeinstallprompt
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
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEventLike
    notifyChange()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notifyChange()
  })
  try {
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMode = () => notifyChange()
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
    return { kind: 'already-installed' }
  }
  const promptEvent = deferredPrompt
  if (promptEvent) {
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      deferredPrompt = null
      notifyChange()
      return choice.outcome === 'accepted' ? { kind: 'accepted' } : { kind: 'dismissed' }
    } catch {
      deferredPrompt = null
      notifyChange()
      return { kind: 'need-guide', platform: detectInstallPlatform() }
    }
  }
  const platform = detectInstallPlatform()
  if (platform === 'ios' || platform === 'android' || platform === 'desktop') {
    return { kind: 'need-guide', platform }
  }
  return { kind: 'unavailable' }
}

export function installGuideSteps(platform: InstallPlatform): { title: string; steps: string[] } {
  if (platform === 'ios') {
    return {
      title: '아이폰 · 홈 화면에 추가',
      steps: [
        'Safari로 이 페이지를 엽니다 (Chrome 등에서는 홈 화면 추가가 제한될 수 있어요).',
        '하단(또는 상단) 공유 버튼을 누릅니다.',
        '「홈 화면에 추가」를 선택한 뒤 추가를 누릅니다.',
        '홈 화면의 AIZIO 아이콘으로 실행하면 설치 버튼은 보이지 않습니다.',
      ],
    }
  }
  if (platform === 'android') {
    return {
      title: '안드로이드 · 홈 화면에 설치',
      steps: [
        'Chrome(또는 Edge) 메뉴(⋮)를 엽니다.',
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
