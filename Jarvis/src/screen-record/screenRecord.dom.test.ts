/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  bindScreenRecordScreen,
  defaultScreenRecordState,
  removeFloatDock,
  renderScreenRecordScreen,
  teardownScreenRecord,
} from './ui/recordScreen'

describe('screen-record float dock (dom)', () => {
  afterEach(() => {
    teardownScreenRecord()
    removeFloatDock()
    document.body.innerHTML = ''
    document.body.className = ''
  })

  it('renders phone stage and mounts external start/stop dock', () => {
    const st = defaultScreenRecordState()
    document.body.innerHTML = renderScreenRecordScreen(st)
    const root = document.querySelector('[data-screc="1"]') as HTMLElement
    expect(root.className).toMatch(/screc-phone/)
    expect(root.querySelector('.screc-stage')).toBeTruthy()
    bindScreenRecordScreen(root, st, () => undefined)
    const dock = document.getElementById('screc-float-dock')
    expect(dock).toBeTruthy()
    expect(document.body.classList.contains('screc-active')).toBe(true)
    const start = dock?.querySelector('[data-screc-float="start"]')
    const stop = dock?.querySelector('[data-screc-float="stop"]')
    expect(start).toBeTruthy()
    expect(stop).toBeTruthy()
    expect(start).not.toBe(stop)
  })
})
