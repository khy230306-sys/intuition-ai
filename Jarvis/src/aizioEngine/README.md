# AIZIO Core Engine V1.3

Commercial Provider Readiness — capability-based selection, Cost Guard, Google Places/Calendar REAL-ready.

## Loop

`의도 분류 → Session Context → Permission → Capability Selection → ToolResult → Verifier → Reply`

## Provider capabilities

`SEARCH_BY_TEXT · NEARBY_SEARCH · PLACE_DETAILS · RATING · REVIEWS · PHOTO · NAVIGATION · ADDRESS_SEARCH`

| Provider | Tier | Role |
|----------|------|------|
| Google Places | commercial | 기본 상용 후보 (키+라이브 검증 시 READY/REAL) |
| Photon | auxiliary | 무료 위치/주소 보조 — 평점·리뷰 생성 금지 |
| AIZIO Local Calendar | local | 내부 일정 |
| Google Calendar | external | OAuth 직전 단계까지 완성 |

## Cost Guard

최소 FieldMask · 세션 placeId 중복 조회 방지 · timeout · retry 상한 · 일별 telemetry · QUOTA_EXCEEDED 매핑  
(Google 정책 위반 장기 캐시 없음)

## Fallback

Google 미연결 시 Photon 가능 범위만 사용 → `degraded=true` + `missingCapabilities`  
가짜 rating/review 생성 금지

## Calendar copy

- Local: 「AIZIO 내부 일정에 저장했습니다」
- External: 「Google Calendar에 등록했습니다」
- Pending: 「Google Calendar가 아직 연결되지 않았습니다」

## Non-goals

Gmail · flights/hotels · payments · Life OS · large UI  
