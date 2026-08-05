import { describe, expect, it, vi } from 'vitest'
import {
  attachMicClickHandlers,
  syncJarvisMicButtons,
  syncSpaceMicButtons,
  syncVoiceCaptions,
} from './voiceUi'

type FakeBtn = {
  tagName: string
  textContent: string
  classList: { _set: Set<string>; contains: (c: string) => boolean; toggle: (c: string, force?: boolean) => void; remove: (c: string) => void }
  dataset: Record<string, string>
  attributes: Map<string, string>
  hasAttribute: (n: string) => boolean
  setAttribute: (n: string, v: string) => void
  getAttribute: (n: string) => string | null
  addEventListener: (type: string, fn: (ev: Event) => void) => void
  click: () => void
  hidden?: boolean
}

function makeBtn(opts: {
  action: string
  text: string
  space?: string
  orb?: boolean
  id?: string
  homePrompt?: boolean
  voiceCaption?: boolean
}): FakeBtn {
  const listeners: Array<(ev: Event) => void> = []
  const attrs = new Map<string, string>()
  attrs.set('data-action', opts.action)
  if (opts.orb) attrs.set('data-home-v2-orb', '1')
  if (opts.homePrompt) attrs.set('data-home-v2-prompt', '1')
  if (opts.voiceCaption) attrs.set('data-voice-caption', '1')
  if (opts.id) attrs.set('id', opts.id)
  const classSet = new Set<string>()
  const btn: FakeBtn = {
    tagName: opts.homePrompt ? 'P' : 'BUTTON',
    textContent: opts.text,
    classList: {
      _set: classSet,
      contains: (c) => classSet.has(c),
      toggle: (c, force) => {
        if (force === true) classSet.add(c)
        else if (force === false) classSet.delete(c)
        else if (classSet.has(c)) classSet.delete(c)
        else classSet.add(c)
      },
      remove: (c) => {
        classSet.delete(c)
      },
    },
    dataset: { action: opts.action, ...(opts.space ? { space: opts.space } : {}) },
    attributes: attrs,
    hasAttribute: (n) => attrs.has(n),
    setAttribute: (n, v) => {
      attrs.set(n, v)
    },
    getAttribute: (n) => attrs.get(n) ?? null,
    addEventListener: (_type, fn) => {
      listeners.push(fn)
    },
    click: () => {
      for (const fn of listeners) fn({} as Event)
    },
    hidden: false,
  }
  return btn
}

function makeRoot(nodes: FakeBtn[]) {
  return {
    querySelectorAll: (sel: string) => {
      return nodes.filter((n) => {
        if (sel === '[data-action="mic"]') return n.getAttribute('data-action') === 'mic'
        if (sel === '[data-action="space-mic"]') return n.getAttribute('data-action') === 'space-mic'
        if (sel.includes('data-home-v2-prompt') || sel.includes('#voice-caption')) {
          return (
            n.getAttribute('id') === 'voice-caption' ||
            n.hasAttribute('data-home-v2-prompt') ||
            n.hasAttribute('data-voice-caption')
          )
        }
        if (sel.startsWith('#') && !sel.includes(',')) {
          return n.getAttribute('id') === sel.slice(1)
        }
        return false
      }) as unknown as NodeListOf<HTMLElement>
    },
  } as unknown as ParentNode
}

describe('voiceUi multi-mic wiring', () => {
  it('attaches handler to every mic button, not only the first', () => {
    const orb = makeBtn({ action: 'mic', text: 'A', orb: true })
    const composer = makeBtn({ action: 'mic', text: 'MIC' })
    const space = makeBtn({ action: 'space-mic', text: 'MIC', space: 'family' })
    const root = makeRoot([orb, composer, space])
    let clicks = 0
    const n = attachMicClickHandlers(root, () => {
      clicks += 1
    })
    expect(n).toBe(2)
    orb.click()
    composer.click()
    expect(clicks).toBe(2)
  })

  it('syncs listening state on orb + composer together', () => {
    const orb = makeBtn({ action: 'mic', text: 'A', orb: true })
    const composer = makeBtn({ action: 'mic', text: 'MIC' })
    const root = makeRoot([orb, composer])
    syncJarvisMicButtons(root, true)
    expect(orb.classList.contains('listening')).toBe(true)
    expect(composer.classList.contains('listening')).toBe(true)
    expect(orb.textContent).toBe('A')
    expect(composer.textContent).toBe('STOP')
    syncJarvisMicButtons(root, false)
    expect(composer.textContent).toBe('MIC')
  })

  it('updates home prompt and caption without leaving stale idle text', () => {
    const prompt = makeBtn({
      action: 'x',
      text: '무엇을 도와드릴까요?',
      id: 'voice-caption',
      homePrompt: true,
    })
    const fam = makeBtn({ action: 'x', text: 'fam', id: 'family-voice-caption' })
    const root = makeRoot([prompt, fam])
    syncVoiceCaptions(root, {
      captionId: 'voice-caption',
      listening: true,
      hint: '오늘 날씨',
      idleHomePrompt: '무엇을 도와드릴까요?',
    })
    expect(prompt.textContent).toContain('오늘 날씨')
    expect(fam.textContent).toBe('fam')
  })

  it('idles space mics when jarvis listens', () => {
    const btn = makeBtn({ action: 'space-mic', text: 'STOP', space: 'friends' })
    btn.classList.toggle('listening', true)
    const root = makeRoot([btn])
    syncSpaceMicButtons(root, { listening: false, space: null })
    expect(btn.classList.contains('listening')).toBe(false)
    expect(btn.textContent).toBe('MIC')
  })

  it('does not only bind first mic (regression guard)', () => {
    const spy = vi.fn()
    const a = makeBtn({ action: 'mic', text: 'A', orb: true })
    const b = makeBtn({ action: 'mic', text: 'MIC' })
    attachMicClickHandlers(makeRoot([a, b]), spy)
    b.click()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
