# i18n Architecture (v1.9.13)

## Implemented

- Locales: `ko`, `en`, `ja`, `vi` under `src/i18n/locales/`
- Detection: saved `settings.appLocale` → `navigator.languages` → `navigator.language` → fallback
- API: `t(key)`, `initAppLocale`, `setAppLocale`
- Applied to: nav labels, settings language/translation block, Global view, media/translation chrome

## Not fully migrated

- Entire LIFE/INVEST/FAMILY body copy remains largely Korean (gradual migration to avoid layout breakage)

## Extending

1. Add locale file + register in `src/i18n/index.ts` and `localeDetector.ts`
2. Add keys to `MessageKey` + all locale tables
