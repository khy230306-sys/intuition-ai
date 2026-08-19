import { I18nProvider } from '../i18n'
import { SettingsProvider } from '../storage/SettingsContext'
import { AppRouter } from './router'

export default function App() {
  return (
    <SettingsProvider>
      <I18nProvider>
        <AppRouter />
      </I18nProvider>
    </SettingsProvider>
  )
}
