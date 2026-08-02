import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  callPhone,
  copyText,
  copyTextNow,
  navigateHref,
  openApp,
  openCamera,
  openJarvisSettings,
  openMaps,
  openSearch,
  openTranslate,
  openWeather,
  quickActions,
  sendSms,
  shareText,
} from './actions'

function stubDom(execResult = true) {
  const exec = vi.fn().mockReturnValue(execResult)
  const ta = {
    value: '',
    contentEditable: 'false',
    readOnly: false,
    style: { cssText: '' },
    setAttribute: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    setSelectionRange: vi.fn(),
  }
  vi.stubGlobal('document', {
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    createElement: vi.fn(() => ta),
    execCommand: exec,
    createRange: () => ({ selectNodeContents: vi.fn() }),
    querySelector: vi.fn(() => null),
  })
  vi.stubGlobal('window', {
    ...globalThis,
    getSelection: () => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
    }),
  })
  return { exec, ta }
}

describe('share/copy helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('copies synchronously via execCommand for iOS click gestures', () => {
    const { exec } = stubDom(true)
    vi.stubGlobal('navigator', {})
    const r = copyTextNow('WDBHL4')
    expect(r.ok).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(r.message).toMatch(/복사/)
  })

  it('copyText prefers sync path before async clipboard', async () => {
    const { exec } = stubDom(true)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const r = await copyText('HELLO')
    expect(r.ok).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to copy when share is unavailable', async () => {
    stubDom(true)
    vi.stubGlobal('navigator', {})
    const r = await shareText('hello invite', { title: 'JARVIS' })
    expect(r.ok).toBe(true)
    expect(r.message).toMatch(/복사/)
  })

  it('uses native share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    const r = await shareText('invite body', { title: 'JARVIS 친구 초대', url: 'https://example.com' })
    expect(r.ok).toBe(true)
    expect(share).toHaveBeenCalledWith({
      text: 'invite body',
      title: 'JARVIS 친구 초대',
      url: 'https://example.com',
    })
  })

  it('does not claim success for fire-and-forget clipboard.writeText alone', () => {
    const { exec } = stubDom(false)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const r = copyTextNow('WDBHL4')
    expect(exec).toHaveBeenCalled()
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/공유하기|길게 눌러/)
  })

  it('prefers a visible invite field selector when provided', () => {
    const field = {
      value: 'WDBHL4',
      classList: { contains: () => false },
      focus: vi.fn(),
      select: vi.fn(),
      setSelectionRange: vi.fn(),
    }
    const exec = vi.fn().mockReturnValue(true)
    vi.stubGlobal('document', {
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      createElement: vi.fn(() => ({
        value: '',
        contentEditable: 'false',
        readOnly: false,
        style: { cssText: '' },
        setAttribute: vi.fn(),
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
      })),
      execCommand: exec,
      createRange: () => ({ selectNodeContents: vi.fn() }),
      querySelector: vi.fn((sel: string) => (sel === '[data-invite-select="code"]' ? field : null)),
    })
    vi.stubGlobal('window', {
      ...globalThis,
      getSelection: () => ({ removeAllRanges: vi.fn(), addRange: vi.fn() }),
    })
    vi.stubGlobal('navigator', {})
    const r = copyTextNow('WDBHL4', { fromSelector: '[data-invite-select="code"]' })
    expect(r.ok).toBe(true)
    expect(field.focus).toHaveBeenCalled()
    expect(exec).toHaveBeenCalledWith('copy')
  })
})

describe('quick-run open helpers', () => {
  const clicks: string[] = []

  beforeEach(() => {
    vi.restoreAllMocks()
    clicks.length = 0
    const anchors: Array<{ href: string; target: string; click: () => void; style: { cssText: string }; rel: string }> =
      []
    vi.stubGlobal('document', {
      body: {
        appendChild: vi.fn((el: { click?: () => void }) => {
          el.click?.()
        }),
      },
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') {
          const a = {
            href: '',
            target: '',
            rel: '',
            style: { cssText: '' },
            click: () => {
              clicks.push(a.href)
            },
            remove: vi.fn(),
          }
          anchors.push(a)
          return a
        }
        if (tag === 'input') {
          return {
            id: '',
            type: '',
            accept: '',
            style: { cssText: '' },
            value: '',
            setAttribute: vi.fn(),
            addEventListener: vi.fn(),
            click: vi.fn(function (this: { id: string }) {
              clicks.push('camera-input')
            }),
          }
        }
        return { style: { cssText: '' }, setAttribute: vi.fn() }
      }),
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null),
    })
    vi.stubGlobal('window', {
      ...globalThis,
      setTimeout: (fn: () => void) => {
        fn()
        return 0
      },
      prompt: vi.fn(() => '서울'),
    })
  })

  it('navigateHref clicks an anchor (not window.open)', () => {
    expect(navigateHref('https://example.com', { newTab: true })).toBe(true)
    expect(clicks.some((u) => u.includes('example.com'))).toBe(true)
  })

  it('opens maps/youtube/weather via working https urls', () => {
    expect(openMaps('서울').opened).toMatch(/maps\.apple\.com/)
    expect(openWeather('부산').opened).toMatch(/google\.com\/search/)
    expect(openApp('유튜브').opened).toMatch(/youtube\.com/)
  })

  it('opens phone/sms dialers and camera capture', () => {
    expect(callPhone('01012345678').opened).toBe('tel:01012345678')
    expect(callPhone('').opened).toBe('tel:')
    expect(sendSms('01012345678', 'hi').opened).toMatch(/^sms:01012345678/)
    expect(openCamera().ok).toBe(true)
    expect(clicks).toContain('camera-input')
  })

  it('routes settings to in-app JARVIS settings view', () => {
    const r = openJarvisSettings()
    expect(r.ok).toBe(true)
    expect(r.view).toBe('settings')
    expect(openApp('설정').view).toBe('settings')
  })

  it('exposes all expected quick-run ids', () => {
    const ids = quickActions.map((a) => a.id)
    expect(ids).toEqual([
      'yt',
      'maps',
      'kakao',
      'weather',
      'notes',
      'calendar',
      'camera',
      'settings',
      'search',
      'translate',
      'phone',
      'sms',
    ])
    expect(openSearch('날씨').ok).toBe(true)
    expect(openTranslate('hello').opened).toMatch(/translate\.google/)
  })
})
