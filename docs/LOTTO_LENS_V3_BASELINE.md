# LottoLens V3 Baseline

Recorded before Intelligence Engine upgrade.

## Framework

| Item | Value |
|------|-------|
| App path | `lotto-analyzer/` |
| Framework | Vite 7 + TypeScript (vanilla SPA, not React/Next) |
| TypeScript | ~5.9.2 |
| Capacitor | @capacitor/core/cli/ios ^8.5.0 |
| iOS project | `lotto-analyzer/ios/` present |
| Bundle ID | `com.aizio.lottolens` |
| Version/Build | 1.0.0 / 1 |

## Existing lottery data

- Bundled: `src/data/draws.json` (compact rows `[round, date, n1..n6, bonus]`)
- Count at baseline: embedded historical draws (offline-first)
- Fetch script: `scripts/fetch-data.mjs` (dhlottery, build-time only)
- Runtime API: none for draws (bundled)

## Existing algorithms

- `src/lib/stats.ts` — frequency, patterns, AC, pairs, chi-square
- `src/lib/flow.ts` — overlap, sum mean-reversion, transitions
- `src/lib/recommend.ts` — weighted strategies (balanced/hot/cold/overdue/pair/flow)

## Camera / QR

- **Not present** in codebase (no NSCameraUsageDescription)
- V3 will add Purchase Scanner + QR **structures** with local-first editing; OCR/camera plugins remain optional BLOCKED without native plugin wiring on this Linux CI

## Persistence

- No localStorage/IndexedDB usage at baseline
- V3 will add local-first IndexedDB/localStorage for tickets/strategies

## Tests

- Smoke: `scripts/smoke-ios-prep.mjs`
- No unit test framework yet → Vitest will be added

## Routing / UI

- Single-page imperative DOM (`src/main.ts` + `src/style.css`)
- Brand: AIZIO + 로또렌즈, teal/gold

## Build status (pre-upgrade)

Commands to re-verify after upgrade:
`npm install && npm run build && npm run smoke:ios`

## Backup

- ZIP: `/opt/cursor/artifacts/lottolens-v3-pre-upgrade-20260817T211247Z.zip`
- Branch base: `cursor/lottolens-ios-appstore-ready-f99e` @ `c5a1192`
- Work branch: `cursor/lottolens-v3-intelligence-f99e`
