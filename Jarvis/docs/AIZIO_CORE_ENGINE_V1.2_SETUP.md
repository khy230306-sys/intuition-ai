# AIZIO Core Engine V1.2 — External Setup

구조·코드·테스트는 완료됨. 아래가 없으면 해당 Provider는 `PENDING_EXTERNAL_SETUP`.

## Places

| Env | 용도 |
|-----|------|
| `VITE_AIZIO_GOOGLE_PLACES_API_KEY` | Google Places API (New) Text Search |

- **Photon (Komoot/OSM)**: API 키 불필요. 네트워크 가능 시 Production에서 READY → REAL 가능.
- Google 키 없으면 Google Places만 PENDING. Photon으로 검색 가능.

## Calendar (External)

| Env | 용도 |
|-----|------|
| `VITE_AIZIO_GOOGLE_CALENDAR_CLIENT_ID` | Google OAuth Client ID |

- OAuth 토큰은 `localStorage` 키 `aizio_google_calendar_oauth_v1`에 저장 (로그인 UI는 후속).
- 미연결 시 기본 경로는 **AIZIO 내부 일정** (localStorage). 외부 성공 문구 금지.

## Test doubles

- `isTestDouble=true` Provider는 Production 호스트/`MODE=production`에서 차단.
- 단위 테스트만 `setAllowTestDoublesForTests(true)` + override.
