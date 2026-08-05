import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPwaInstalledMark,
  copyAppUrl,
  detectInstallPlatform,
  getRecommendedInstallUrl,
  hasPwaInstalledMark,
  installCtaLabel,
  installGuideSteps,
  isIosNonSafari,
  isMobileInstallTarget,
  isPreviewInstallHost,
  isRunningAsInstalledPwa,
  markPwaInstalled,
  PRODUCTION_INSTALL_URL,
  setDeferredInstallPromptForTests,
  shouldShowInstallButton,
} from './pwaInstall'

function memStore(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      m.set(k, String(v))
    },
    removeItem: (k: string) => {
      m.delete(k)
    },
    key: (i: number) => [...m.keys()][i] ?? null,
  }
}

function fakeWin(opts: {
  standaloneMq?: boolean
  iosStandalone?: boolean
  ua?: string
  referrer?: string
}): Pick<Window, 'matchMedia'> & { navigator: Navigator; document: Document } {
  const ua = opts.ua || 'Mozilla/5.0'
  return {
    matchMedia: (q: string) =>
      ({
        matches: Boolean(opts.standaloneMq && q.includes('standalone')),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as MediaQueryList,
    navigator: {
      userAgent: ua,
      standalone: opts.iosStandalone,
    } as Navigator & { standalone?: boolean },
    document: { referrer: opts.referrer || '' } as Document,
  }
}

describe('pwaInstall', () => {
  beforeEach(() => {
    setDeferredInstallPromptForTests(null)
    clearPwaInstalledMark()
  })

  it('hides button when running as installed PWA', () => {
    const store = memStore()
    expect(isRunningAsInstalledPwa(fakeWin({ standaloneMq: true }))).toBe(true)
    expect(shouldShowInstallButton(fakeWin({ standaloneMq: true, ua: 'iPhone' }), store)).toBe(false)
    expect(hasPwaInstalledMark(store)).toBe(true)
    expect(isRunningAsInstalledPwa(fakeWin({ iosStandalone: true, ua: 'iPhone' }))).toBe(true)
  })

  it('hides button after installed mark even in Safari tab', () => {
    const store = memStore()
    markPwaInstalled(store)
    expect(
      shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), store),
    ).toBe(false)
  })

  it('shows button on mobile browser when not installed', () => {
    const store = memStore()
    expect(
      shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), store),
    ).toBe(true)
    expect(shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (Linux; Android 14)' }), store)).toBe(true)
    expect(shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (Windows NT 10.0)' }), store)).toBe(false)
  })

  it('detects platforms and guide copy', () => {
    expect(detectInstallPlatform('iPhone')).toBe('ios')
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1')).toBe(
      'ios-chrome',
    )
    expect(isIosNonSafari('CriOS/120 iPhone')).toBe(true)
    expect(detectInstallPlatform('Android 14')).toBe('android')
    expect(isMobileInstallTarget('iPad')).toBe(true)
    expect(installGuideSteps('ios').steps.length).toBeGreaterThan(2)
    expect(installGuideSteps('ios').steps.join(' ')).toMatch(/Safari 공유/)
    expect(installGuideSteps('ios', { previewHost: true }).steps.join(' ')).toMatch(/Preview/)
    expect(installGuideSteps('ios-chrome').title).toMatch(/Safari/)
    expect(installGuideSteps('android').title).toMatch(/안드로이드/)
    expect(installCtaLabel('ios')).toMatch(/설치 방법/)
    expect(isPreviewInstallHost('pulsing-bloom-qk5a536.shipstatic.com')).toBe(true)
    expect(isPreviewInstallHost('jarvis-app.shipstatic.com')).toBe(false)
    expect(getRecommendedInstallUrl('pulsing-bloom-qk5a536.shipstatic.com', 'https://pulsing-bloom-qk5a536.shipstatic.com')).toBe(
      PRODUCTION_INSTALL_URL,
    )
    expect(getRecommendedInstallUrl('jarvis-app.shipstatic.com', 'https://jarvis-app.shipstatic.com')).toBe(
      'https://jarvis-app.shipstatic.com',
    )
  })

  it('copyAppUrl returns boolean without throwing', async () => {
    const ok = await copyAppUrl()
    expect(typeof ok).toBe('boolean')
  })
})
