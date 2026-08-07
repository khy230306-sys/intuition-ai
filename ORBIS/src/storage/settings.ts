export type Language = 'ko' | 'en'
export type AnimationQuality = 'low' | 'medium' | 'high'

export type AppSettings = {
  language: Language
  soundEnabled: boolean
  animationQuality: AnimationQuality
  reduceMotion: boolean
}

export const SETTINGS_STORAGE_KEY = 'orbis.settings.v1'

export const defaultSettings: AppSettings = {
  language: 'ko',
  soundEnabled: false,
  animationQuality: 'medium',
  reduceMotion: false,
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return { ...defaultSettings }
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) {
      return {
        ...defaultSettings,
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      }
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      language: parsed.language === 'en' ? 'en' : 'ko',
      soundEnabled: Boolean(parsed.soundEnabled),
      animationQuality:
        parsed.animationQuality === 'low' ||
        parsed.animationQuality === 'high' ||
        parsed.animationQuality === 'medium'
          ? parsed.animationQuality
          : 'medium',
      reduceMotion: Boolean(parsed.reduceMotion),
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
