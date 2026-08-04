import { ko, type MessageKey } from '@/i18n/ko'

const dictionaries = {
  ko,
  en: {
    ...ko,
    appName: 'POKER DIRECTOR',
    subtitle: 'Integrated Hold\'em Tournament Operations',
    login: 'Login',
    username: 'Username',
    password: 'Password',
    demoHint: 'Demo account: admin / 1234',
    dashboard: 'Dashboard',
    timer: 'Timer',
    players: 'Players',
    tables: 'Tables',
    more: 'More',
    home: 'Home',
  } as Record<MessageKey, string>,
}

let lang: 'ko' | 'en' = 'ko'

export function setLanguage(next: 'ko' | 'en') {
  lang = next
}

export function t(key: MessageKey): string {
  return dictionaries[lang][key] ?? dictionaries.ko[key] ?? key
}
