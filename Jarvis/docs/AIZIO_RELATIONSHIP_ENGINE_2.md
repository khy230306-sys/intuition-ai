# AIZIO Relationship Engine 2.0

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
