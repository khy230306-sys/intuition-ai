# LottoLens 3.0 Release Notes

## Version

App version `1.0.0` (Capacitor / iOS). Product surface: **LottoLens 3.0 Intelligence Engine**.

## Mobile demo

**https://1sbxc0sr.nivii.app** (deployed 2026-08-18, expires ~2026-09-17)

## Branch

`cursor/lottolens-v3-intelligence-f99e`

## Backup

- Pre-upgrade ZIP: `/opt/cursor/artifacts/lottolens-v3-pre-upgrade-20260817T211247Z.zip`
- Backup branch: `cursor/lottolens-v3-backup-20260817T211247Z`

## Verify

```bash
cd lotto-analyzer
npm install
npm run typecheck
npm test
npm run build
npm run smoke:ios
npx cap sync ios   # or npm run cap:sync
```

## iOS

- Bundle ID unchanged: `com.aizio.lottolens`
- Camera/OCR/QR: **BLOCKED** until Capacitor Camera / barcode plugins + Info.plist usage strings are added on a Mac. Manual ticket entry works.

## Disclaimer

Analysis is historical statistics only — not a prediction or guarantee of future wins.

## Migration

V3 store initializes empty local keys. Classic UI remains under 클래식 tab. Generator/My Lotto data lives in `lottolens.v3.*`.
