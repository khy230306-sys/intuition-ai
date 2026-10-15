import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadSettings,
  saveSettings,
  type AnimationQuality,
  type AppSettings,
  type Language,
} from './settings'

type SettingsContextValue = {
  settings: AppSettings
  setLanguage: (language: Language) => void
  setSoundEnabled: (enabled: boolean) => void
  toggleSound: () => void
  setAnimationQuality: (quality: AnimationQuality) => void
  setReduceMotion: (enabled: boolean) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  useEffect(() => {
    saveSettings(settings)
    document.documentElement.lang = settings.language
    document.documentElement.dataset.quality = settings.animationQuality
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion)
  }, [settings])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setLanguage: (language) => update({ language }),
      setSoundEnabled: (soundEnabled) => update({ soundEnabled }),
      toggleSound: () => update({ soundEnabled: !settings.soundEnabled }),
      setAnimationQuality: (animationQuality) => update({ animationQuality }),
      setReduceMotion: (reduceMotion) => update({ reduceMotion }),
    }),
    [settings, update],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return ctx
}
