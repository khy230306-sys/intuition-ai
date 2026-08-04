# Korea place search audit (Navigation v2 Preview)

**Date:** 2026-08-04  
**Provider under test:** Local Preview catalog (`koreaPlaceCatalog.ts`)  
**Verdict:** Preview QA seed is usable for listed landmarks; **not** a national live search. Do not claim completion of Korean POI coverage.

## Method

Automated Vitest + catalog scoring. Remote Nominatim not used for keystroke autocomplete.

## Results

| Query | Results? | Hangul name | Address | Coords | Notes |
| --- | --- | --- | --- | --- | --- |
| 역삼동 | Yes (multi) | Yes | Yes | Yes | 주민센터·역 등 복수 후보 |
| 역삼1동 주민센터 | Yes | Yes | Yes | Yes | |
| 역삼역 | Yes | Yes | Yes | Yes | |
| 강남역 | Yes | Yes | Yes | Yes | |
| 서울역 | Yes | Yes | Yes | Yes | |
| 울산역 | Yes | Yes | Yes | Yes | |
| 부산역 | Yes | Yes | Yes | Yes | |
| 망양길 50 | Catalog-dependent | — | — | — | Seed if present; else empty → ask refine |
| 울산대학교병원 | Catalog-dependent | — | — | — | Seed if present |
| 주변 약국 | Yes when catalog has pharmacy | Yes | Yes | Yes | Distance sort with origin |
| 주변 주차장 | Same | | | | |
| 주변 주유소 | Same | | | | |
| 역삼동 주 | Yes (주민센터 bias) | Yes | Yes | Yes | Partial / ASR-style |

## Quality limits (honest)

- Overseas false positives: mitigated by Korea-only seed catalog (not a full geocoder).
- Administrative vs legal dong: limited aliases only.
- Chain stores: few seeds — not exhaustive.
- Without `VITE_AIZIO_PLACE_SEARCH_URL`, empty results are real empties — **no invented places**.

## Production path

Self-hosted Nominatim/Pelias or licensed Korean geocoder required for nationwide quality. Documented in `AIZIO_NAVIGATION_V2_PROVIDER_SETUP.md`.
