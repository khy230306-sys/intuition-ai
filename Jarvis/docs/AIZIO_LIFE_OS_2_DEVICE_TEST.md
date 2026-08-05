# AIZIO Life OS 2.0 Device Test

## Status legend
실제 구현 · 부분 구현 · Feature Flag 비활성 가능 · 외부 API 필요 · 외부 서버 필요 · 실기기 미확인 · 향후 작업

## Summary
See `src/life-os-2/` and `docs/AIZIO_LIFE_OS_2_ARCHITECTURE.md`.

## Implementation
- Code: linked module under `src/life-os-2/`
- Feature flags: `aizio_life_os2_flags_v1`
- Tests: `src/life-os-2/lifeOS2.test.ts`

## Honest gaps
- Real-device verification: 실기기 미확인
- Emotion/Trust engines: 미구현 (not in codebase)
- Live commute/weather in companion: 외부 API 필요 when not cached
## Template (fill on device)

| Case | Input | Expected | Actual | Pass | Capture |
|------|-------|----------|--------|------|---------|
| Context | 오늘 뭐 해야 해? | Context Fusion summary | 미확인 | | |
| Morning | 모닝 브리프 | morning companion | 미확인 | | |
| Evening | 저녁 요약 | evening companion | 미확인 | | |
| Focus | 집중 모드 시작 | session + OS limit notice | 미확인 | | |
| Habit | 습관 목록 | candidates or empty | 미확인 | | |
| Knowledge | 지식 검색 AIZIO | sourced results or none | 미확인 | | |
| Automation | 퇴근하면 집 길안내하고 음악 준비 | plan, not run | 미확인 | | |
| Coach | AIZIO 출시 목표 상황 | coach card | 미확인 | | |
| Music regress | 조용한 음악 틀어줘 | music skill | 미확인 | | |
| Offline | airplane + 오늘 뭐 해야 | local context | 미확인 | | |
