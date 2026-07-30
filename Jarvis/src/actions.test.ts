import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyText, shareText } from './actions'

describe('share/copy helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('copies via clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const r = await copyText('MNBV2')
    expect(r.ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('MNBV2')
  })

  it('falls back to copy when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const r = await shareText('hello invite', { title: 'JARVIS' })
    expect(r.ok).toBe(true)
    expect(writeText).toHaveBeenCalled()
    expect(r.message).toMatch(/복사/)
  })

  it('uses native share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    const r = await shareText('invite body', { title: 'JARVIS 친구 초대', url: 'https://example.com' })
    expect(r.ok).toBe(true)
    expect(share).toHaveBeenCalledWith({
      text: 'invite body',
      title: 'JARVIS 친구 초대',
      url: 'https://example.com',
    })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies after share abort so invite is not lost', async () => {
    const err = new DOMException('blocked', 'AbortError')
    const share = vi.fn().mockRejectedValue(err)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    const r = await shareText('CODE123')
    expect(r.ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('CODE123')
  })
})
