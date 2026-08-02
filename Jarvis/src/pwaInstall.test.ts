import { describe, expect, it } from 'vitest'
import {
  detectInstallPlatform,
  installGuideSteps,
  isMobileInstallTarget,
  isRunningAsInstalledPwa,
  setDeferredInstallPromptForTests,
  shouldShowInstallButton,
} from './pwaInstall'

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
  it('hides button when running as installed PWA', () => {
    setDeferredInstallPromptForTests(null)
    expect(isRunningAsInstalledPwa(fakeWin({ standaloneMq: true }))).toBe(true)
    expect(shouldShowInstallButton(fakeWin({ standaloneMq: true, ua: 'iPhone' }))).toBe(false)
    expect(isRunningAsInstalledPwa(fakeWin({ iosStandalone: true, ua: 'iPhone' }))).toBe(true)
  })

  it('shows button on mobile browser when not installed', () => {
    setDeferredInstallPromptForTests(null)
    expect(shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }))).toBe(
      true,
    )
    expect(shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (Linux; Android 14)' }))).toBe(true)
    expect(shouldShowInstallButton(fakeWin({ ua: 'Mozilla/5.0 (Windows NT 10.0)' }))).toBe(false)
  })

  it('detects platforms and guide copy', () => {
    expect(detectInstallPlatform('iPhone')).toBe('ios')
    expect(detectInstallPlatform('Android 14')).toBe('android')
    expect(isMobileInstallTarget('iPad')).toBe(true)
    expect(installGuideSteps('ios').steps.length).toBeGreaterThan(2)
    expect(installGuideSteps('android').title).toMatch(/안드로이드/)
  })
})
