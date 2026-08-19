# AIZIO Execution Backlog

**Updated:** 2026-08-09  
**방법서:** [`AIZIO_NATURAL_EXECUTION_PLAYBOOK.md`](./AIZIO_NATURAL_EXECUTION_PLAYBOOK.md)  
**진실원:** [`AIZIO_FULL_CURRENT_STATE.md`](./AIZIO_FULL_CURRENT_STATE.md)

> 규칙: P0를 Done으로 올리기 전에 P2 UI를 늘리지 않는다.  
> 각 항목 완료 시 방법서 §4 체크리스트 + Intent Catalog / Current State 라벨을 같은 PR에서 갱신.

---

## P0 — 매일 비서 (로컬 먼저)

- [ ] **update_todo** — “우유 할 일 완료/삭제”가 목록에 반영 (현재 unavailable)
- [ ] **create_calendar_event** — 개인 일정 저장 경로 결정 후 Partial 이상, 또는 가족 일정으로만 유도 + 정직 멘트
- [ ] **골든 문장 테스트** — 방법서 Phase 1.1 표 문장을 자동 테스트로 고정
- [ ] **음성=텍스트** — 동일 P0 문장 MIC 경로 스모크 (실기기 체크리스트 연동)
- [ ] **오분류 회귀** — 「가족 일정」→ calendar, 「봤어」는 cue 있을 때만 complete (기존 규칙 유지)

## P1 — AI·번역·Life OS 음성

- [ ] Hybrid 컨텍스트에 **오늘 할 일·알람 요약** 주입 (로컬 miss 후 대화만)
- [ ] **Claude provider** + `planning` / AI Meeting 라우팅 (유료 폴백 기본 OFF)
- [ ] **DeepL/Google 번역** 배선 (`TRANSLATION_PROVIDER_SETUP.md`)
- [ ] Life OS: DNA / Goals / Ideas를 **채팅 명령**으로 CRUD (UI만 있는 상태 해소)
- [ ] AI Meeting: 로컬 템플릿 폴백 + Claude/Hybrid 1회 요약 경로 명확화
- [ ] Projects: 구 project skill unavailable vs Life OS projects **단일화**

## P2 — 신뢰·확장

- [ ] push-server로 **앱 종료 후 개인 알람**
- [ ] 백업 export/import에 relationships / smart reminders / `aizio_life_*` 검증
- [ ] Vision 스킬 (사진→메모) — Gemini/Claude Vision
- [ ] Health / Finance / Travel / Learning shell — 숨김 또는 “기록만” 라벨 (Done 사칭 금지)
- [ ] 계정·멀티기기 동기화 (별도 에픽; 당분간 Guest local 고지)

## Done this week

- [x] 자연 실행 방법서 초안 (`AIZIO_NATURAL_EXECUTION_PLAYBOOK.md`)
- [x] 실행 백로그 파일 생성 (이 문서)
