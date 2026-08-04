# AIZIO AI 길안내 v1

**Scope:** Understand destination + travel mode → open Apple / Google / Kakao / Naver maps (app or safe HTTPS web).  
**Not in v1:** Turn-by-turn navigation engine, live traffic ETA, background route tracking.

## Supported commands (examples)

- 집으로 안내해 줘 / 회사까지 길 찾아줘  
- 울산역으로 가자 / 서울역까지 자동차로 안내해 줘  
- 가까운 약국 / 근처 주차장 / 주변 카페  
- 도보로 · 대중교통으로 · 자전거로  
- 카카오맵으로 열어줘 / 구글 지도로 안내해 줘  

Non-nav: 「회사 이야기해 줘」 is **not** treated as navigation.

## Intent shape

See `src/navigation/navigationTypes.ts` — `NavigationIntent` with  
`navigation.open_route` | `search_nearby` | `open_map` | …

## Map provider policy

| Preference | Behavior |
|------------|----------|
| 자동 | iOS → Apple, Android → Google, else Google web |
| Apple / Google / 카카오 / 네이버 | Prefer that provider; always HTTPS web fallback |
| Desktop | HTTPS map search / directions |

Only allowlisted schemes/hosts (`navigationUrlBuilder.ts`). Reject `javascript:`, `data:`, unknown hosts.

## Location

- Requested only after user gesture (sheet start / explicit settings button / nearby intent).  
- Coordinates are **ephemeral** (never written to localStorage/server).  
- Denied permission still opens map search; copy avoids claiming “가장 가까운” when location unknown.

## Saved places

Local only: home, work, favorites (`aizio.navigation.settings.v1`).  
Diagnostics expose `hasHome` / `hasWork` — **not** full addresses.

## HOME entry

HOME v2 quick action **길안내** → bottom sheet (`?nav=1`).  
Music remains under 전체 → 생활 → 음악.

## Future (not promised in v1)

Departure reminder draft fields documented in `DepartureReminderDraft` for linking calendar arrival times to routes later.
