# AIZIO Core Engine V1.3 — External Setup

코드/테스트/오류처리/Cost Guard/OAuth 구조는 완료. 아래가 없으면 해당 Provider는 `PENDING_EXTERNAL_SETUP`.

## Places (Google — commercial)

| Env | 용도 |
|-----|------|
| `VITE_AIZIO_GOOGLE_PLACES_API_KEY` | Places API (New) Text / Nearby / Details |

- 키만 있고 라이브 호출 검증 전 → 아직 READY/REAL 아님
- 키 없을 때: Photon 보조 검색 (degraded, 평점 없음)

## Calendar (Google — external)

| Env | 용도 |
|-----|------|
| `VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID` | OAuth Client ID |
| `VITE_AIZIO_GOOGLE_CALENDAR_REDIRECT_URI` | (선택) OAuth redirect |

- `authorize()` → Google OAuth URL 생성
- 토큰: `localStorage` `aizio_google_calendar_oauth_v1`
- 미연결 기본 경로: AIZIO 내부 일정

## Test doubles

Production에서 `isTestDouble` 차단. 단위 테스트만 `setAllowTestDoublesForTests(true)`.
