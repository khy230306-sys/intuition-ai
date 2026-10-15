import { beforeEach, describe, expect, it } from 'vitest'
import {
  SETTINGS_STORAGE_KEY,
  defaultSettings,
  loadSettings,
  saveSettings,
} from '../storage/settings'

describe('settings storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns defaults when empty', () => {
    const settings = loadSettings()
    expect(settings.language).toBe(defaultSettings.language)
    expect(settings.soundEnabled).toBe(false)
    expect(settings.animationQuality).toBe('medium')
  })

  it('persists and reloads settings', () => {
    saveSettings({
      language: 'en',
      soundEnabled: true,
      animationQuality: 'high',
      reduceMotion: true,
    })

    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    expect(raw).toContain('"language":"en"')

    const loaded = loadSettings()
    expect(loaded).toEqual({
      language: 'en',
      soundEnabled: true,
      animationQuality: 'high',
      reduceMotion: true,
    })
  })

  it('falls back safely on invalid JSON', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken')
    const loaded = loadSettings()
    expect(loaded.language).toBe('ko')
    expect(loaded.soundEnabled).toBe(false)
  })
})
