import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSettings } from '../storage/SettingsContext'
import { en } from './locales/en'
import { ko, type Dictionary } from './locales/ko'

const I18nContext = createContext<Dictionary>(ko)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const dictionary = useMemo(
    () => (settings.language === 'en' ? en : ko),
    [settings.language],
  )

  return <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
