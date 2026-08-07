# AIZIO Feature Truth Audit (v1.30.7)

Evidence-based classification. Buttons/menus/code presence alone do **not** count as REAL.

- **Backup ZIP:** `/opt/cursor/artifacts/backups/AIZIO-full-backup-20260807-204147.zip`
- **Branch:** `cursor/aizio-real-fake-audit-6b16`
- **Registry:** `src/featureTruth/registry.ts`

## Cleanup applied (no new features)

1. Production travel/restaurant registries return `unavailable` providers (empty lists + honest copy).
2. Action Agent flight/hotel gates: `NEEDS_PROVIDER` when DEMO (fixtures only in tests).
3. DEMO booking confirmation codes refused unless `setLegacyDemoProvidersEnabled(true)`.
4. More hub + home quick actions hide travel/restaurant.
5. `#travel` / `#restaurant` screens show **미연결** (no fake search CTA).
6. Vision: no mock OCR fallback as user-facing analysis.
7. Mock providers kept for Vitest / reliability multi-turn harness only (`legacy/demoProviders/README.md`).

## REAL

| Feature | Connection | Test |
|--------|------------|------|
| 번역 | MyMemory + offline dict | vitest / router session |
| 일정·할일·알림·알람 | localStorage + Notification | vitest / AA calendar |
| 가족·멤버 / 친구 | localStorage + MQTT P2P | family/friends e2e scripts |
| Life OS / DNA | localStorage | life-os tests |
| 손님관리 CRM | localStorage | customers storage |
| 게임·로또·주사위 | local RNG / canvas | arcade tests |
| 百科/사전 | Wikipedia REST | encyclopedia |
| 가계부 | localStorage | storage/expense |
| 빠른 실행 앱 연결 | URL/scheme open | actions |
| 음악 | YouTube search URL open | music tests |
| 라이프스타일 추천 | curated ideas + Maps/search open | lifestyleRecommend |
| 백업·진단 | local JSON / release health | featureDiag |

## PARTIAL

| Feature | Real part | Incomplete / caveat |
|--------|-----------|---------------------|
| 대화/LLM | Keys → hybrid LLM | No keys → local templates |
| 날씨 | Open-Meteo (home) | Chat often opens Google / cache |
| 환율 | Live FX APIs | Labeled offline FALLBACK_RATES |
| 주식 | Yahoo + snapshot | Holdings local only |
| 길안내 | Photon/Nominatim/OSRM or map URL | Seed catalog / approx route |
| 뉴스 | Opens Google search | No in-app feed |
| 푸시 | Web Push when server/VAPID set | Else local only |
| AI 카메라 | OpenAI/OpenRouter vision if keys | Without keys: needs_provider (no mock) |
| 앱 i18n | ko/en/ja/vi/zh UI keys | Partial string coverage |

## FAKE (hidden / disabled in UI)

| Feature | Why fake | UI treatment |
|--------|----------|--------------|
| 여행·항공·호텔 DEMO | Seeded offers, invented prices, DEMO PNR | Menu hidden; screen 미연결; chat NEEDS_PROVIDER / MSG |
| 맛집·예약 DEMO | Seeded venues/phones/slots; DEMO confirm | Menu hidden; screen 미연결; chat unavailable MSG |
| Vision mock OCR | Hardcoded demo analysis | No longer returned to users |

## BROKEN (keep code; do not delete)

| Feature | Cause | Fixable? |
|--------|-------|----------|
| Duffel/Amadeus/Expedia live search | Provider classes `throw` “Use Demo” | Yes — implement real adapters + keys |
| External restaurant provider | Stub throws | Yes — wire real API |

## Counts

- 전체 기능(감사 단위): **27**
- REAL: **12**
- PARTIAL: **9**
- FAKE: **3**
- BROKEN: **2**

## Trustworthy for daily use (no external key required)

번역 · 일정/할일/알림 · 가족/친구 공간 · Life OS · 손님관리 · 게임 · 가계부 · 백업 · 음악(YouTube 열기) · 라이프스타일「근처 맛집」지도 열기 · 빠른 실행

## Needs user setup to be fully real

- LLM 채팅: AI Provider API 키
- AI 카메라: Vision API 키
- 푸시: push server URL + VAPID
- 여행/맛집 실검색: 아직 Live 어댑터 미구현 (키만으로는 BROKEN)
