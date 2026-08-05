# AIZIO HOME v2 Preview (design review)

**Status:** 디자인 검토 대기  
**Version:** 1.15.3  
**Commit:** 48e7b1a  
**Does not change production:** https://jarvis-app.shipstatic.com

## Preview URLs

옛 `airy-dome-…` 스냅샷은 만료되어 404입니다. 아래 주소를 사용하세요.

| | URL |
|--|--|
| 고정 프로덕션 | https://jarvis-app.shipstatic.com |
| Preview (현재) | https://electric-bead-noe597o.shipstatic.com |
| Legacy direct | https://electric-bead-noe597o.shipstatic.com/?home=legacy |
| HOME v2 direct | https://electric-bead-noe597o.shipstatic.com/?home=v2 |

## What this is

A **parallel** home layout for review. Legacy `renderChat()` / home widget is preserved.
Default remains the existing home unless Preview settings or `?home=v2` select HOME v2.

## How to open

| Mode | URL / action |
|------|----------------|
| Legacy (default) | Preview root or `?home=legacy` |
| HOME v2 | `?home=v2` |
| Settings lab | Preview → 설정 → **디자인 테스트 · HOME v2** |

## Layout (v2)

1. Header — greeting, date/time, weather (hidden if none), settings  
2. Today summary strip — todos / next alarm / unread  
3. AIZIO voice orb — existing MIC handler  
4. Composer — existing send / draft / translate badge → 번역 설정  
5. Quick ×4 — 브리핑 · 일정 추가 · 날씨 · 음악 (`handleUserText`)  
6. Smart card — schedule → todos → messages → empty  
7. Nav ×5 — 홈 · 대화 · 생활 · 가족 · 전체  

## Screenshots

`/tmp/cursor/artifacts/home-v2-shots/`

## Push server

Optional for this design review. Empty `preview-config` default is OK; set URL in Settings if testing push.
