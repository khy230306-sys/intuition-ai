import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyText, copyTextNow, shareText } from './actions'

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
