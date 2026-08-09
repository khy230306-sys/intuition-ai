# AIZIO 자연 실행 방법서 (Natural Execution Playbook)

**목적:** 설계만 된 비서 기능을 “말로 시키면 실제로 된다” 수준까지 올리는 **작업 순서·합격 기준·금지 규칙**을 한곳에 고정한다.  
**대상:** AIZIO (`아이지오`) PWA — Core Brain + Hybrid AI + Life OS  
**기준 문서:** `AIZIO_FULL_CURRENT_STATE.md`, `AIZIO_CURRENT_FLOW_MAP.md`, `AIZIO_SKILL_INTERFACE.md`, `AIZIO_INTENT_CATALOG.md`, `AIZIO_RELEASE_CHECKLIST.md`

---

## 0. “자연 실행”의 정의 (합격선)

기능이 **자연스럽게 실행 가능**하려면 아래를 **모두** 만족해야 한다.

| # | 조건 | 실패 예 |
|---|------|---------|
| N1 | 사용자가 **일상 문장**으로 요청한다 | 숨겨진 버튼·특수 명령만 동작 |
| N2 | Core Brain이 intent를 잡고 **올바른 스킬/도메인**으로 보낸다 | 엉뚱한 탭만 열리거나 침묵 |
| N3 | 스킬이 **실제 데이터/외부 액션**을 수행한다 | UI shell만 CRUD, “준비됨” 가짜 성공 |
| N4 | 결과는 **한 문장 답 + (필요 시) 화면/TTS**로 돌아온다 | 콘솔만 로그, 사용자는 모름 |
| N5 | 불가한 일은 **정직하게 unavailable** | “완료됐습니다” 거짓말 |
| N6 | AI 없이도 로컬 비서는 동작하고, AI는 **보강**만 한다 | 키 없으면 앱 전체가 먹통 |
| N7 | 음성·텍스트가 **같은 파이프라인**을 탄다 | 마이크만 다른 경로 |

> **한 줄 기준:** “엄마 병원 내일 3시 알려줘” → 저장·알람·확인 멘트가 실제로 나와야 한다.  
> 설계 문서·타입·패널만 있으면 **자연 실행이 아니다**.

### 상태 라벨 (작업·리뷰에만 사용)

| 라벨 | 의미 | 사용자에게 말해도 되는가 |
|------|------|-------------------------|
| **Done** | N1–N7 통과, 테스트 있음 | 예 |
| **Partial** | 핵심 경로는 되나 한계가 명시됨 | 한계와 함께 예 |
| **UI shell** | 화면/로컬 CRUD만, 음성·브레인 미연결 | 아니오 (실험 표시) |
| **Needs server / key** | 서버 또는 사용자 키 필수 | 설정 안내와 함께 |
| **Unavailable** | 의도적으로 막음 + 정직 메시지 | 예 (불가 안내) |

---

## 1. 아키텍처 고정 (바꾸지 말 것)

자연 실행은 **새 앱을 만드는 일**이 아니라, 아래 관을 **채우는 일**이다.

```
사용자 (텍스트 | 음성)
  → main.handleUserText
  → brain.think
  → processCoreBrain
       의도 → 엔티티 → 계획 → 안전 → 스킬 실행 → 한 답 합성
  → (필요 시) legacy 도메인 핸들러
  → (필요 시) Hybrid AI / 전문 Provider
  → 채팅 UI + 선택적 TTS + uiActions
```

| 레이어 | 역할 | 금지 |
|--------|------|------|
| Core Brain | 의도·계획·안전·스킬 선택 | 스킬이 DOM을 직접 만지지 않음 |
| Skill | 실제 업무 수행 (`SkillResult`) | 가짜 `success` |
| Legacy handlers | invest / life / geo / translate 등 기존 권위 | Core와 이중 저장 |
| Hybrid AI | 잡담·요약·계획 문장 | API 없이 “AI 완료” 주장 |
| Specialist API | 시세·번역·지도·푸시 | LLM이 숫자를 지어냄 |

**멀티 AI 원칙:** 한 “뇌”(라우터) + 여러 “손”(전문가).  
Claude·Gemini·Groq·DeepL·Yahoo는 **intent별 담당**이지, 서로 다른 앱이 아니다.

---

## 2. 전체 작업 순서 (Phase 0 → 7)

아래 순서를 **건너뛰지 않는다**. 앞 단계 Done 없이 뒤 단계 UI를 키우면 shell만 늘어난다.

| Phase | 이름 | 목표 | 나가기 조건 |
|-------|------|------|-------------|
| **0** | 진실 목록 | Done / Partial / Shell / Needs* 재고 | 표가 코드와 일치 |
| **1** | 로컬 비서 완성 | AI 없이 일상 명령이 됨 | 핵심 로컬 시나리오 전부 |
| **2** | Intent ↔ Skill 구멍 메우기 | unavailable·오분류 제거/정직화 | 카탈로그 = 실제 동작 |
| **3** | Hybrid AI 일상화 | 키 설정 → 자연 대화·폴백 | 무료 체인 + 설정 UX |
| **4** | 분야별 전문가 붙이기 | 번역·시세·지도·비전·Claude | intent→provider 표 적용 |
| **5** | Life OS를 말로 움직이기 | DNA/목표/회의/루틴을 음성·채팅으로 | shell → Done/Partial |
| **6** | 서버·푸시·백업 | 앱 종료 후에도 약속 지키기 | push-server + 백업 키 완전 |
| **7** | 실기기·출시 게이트 | iPhone에서 “비서처럼” | Release checklist 통과 |

---

## 3. Phase별 방법 (어떻게 하는가)

### Phase 0 — 진실 목록 (반나절 작업 단위)

1. `AIZIO_FULL_CURRENT_STATE.md` Feature inventory를 연다.  
2. 각 행을 **실제 음성 한 문장**으로 시험한다.  
3. 결과가 N1–N7을 깨면 라벨을 내린다 (Done → Partial/Shell).  
4. 산출물: `docs/AIZIO_EXECUTION_BACKLOG.md` (아래 템플릿)에 **P0/P1/P2**만 남긴다.

**백로그 한 줄 형식**

```text
[P0] create_calendar_event | Unavailable → Partial | 개인 일정 localStorage CRUD + intent
     합격: "내일 3시 치과" → 저장 + list_calendar에 보임 + 정직 TTS
```

우선순위 규칙:

- **P0:** 매일 쓰는 비서 문장 (할 일, 알람, 메모, 일정, 관계, 길찾기 열기, 시세 질문)
- **P1:** AI 대화 품질, 번역, Life OS 음성, 회의 정리
- **P2:** Vision, 스토어, 계정 동기화, 고급 자동화

---

### Phase 1 — 로컬 비서 완성 (AI 없이 먼저)

**왜 먼저인가:** 키가 없는 날에도 비서가 “일”을 해야 한다. Hybrid AI는 문장 보강일 뿐이다.

#### 1.1 필수 시나리오 (반드시 Done)

| 사용자 말 | Intent | 저장/액션 | 기대 답 |
|-----------|--------|-----------|---------|
| 우유 사기 할 일 추가해 | `create_todo` | `jarvis_reminders_v1` | 추가됨 + 목록 힌트 |
| 할 일 보여줘 | `list_todo` | 읽기 | 목록 |
| 메모해: 와이파이 비번 1234 | `create_note` | `jarvis_memory_v1` | 저장됨 |
| 오후 3시 약 먹으라고 알려줘 | `create_reminder` | smart reminders + local alarm | 시간 확인 멘트 |
| 엄마 이름은 김○○ | `remember_relationship` | relationships | 기억함 |
| 가족 일정 보여줘 | `list_calendar` | family/friends merge | 목록 또는 없음 |
| 투자 화면 가줘 | `app_navigation` | `view=invest` | 화면 전환 |
| 강남역 가는 길 | navigation/geo | 지도 앱 URL | 열기/링크 (가짜 ETA 금지) |

#### 1.2 작업 방법 (스킬 하나를 Done으로 올리는 루프)

매 기능마다 **같은 순서**로만 한다.

1. **문장 수집** — 한국어 일상 문장 5개 이상 (성공 3 / 애매 1 / 거절 1)  
2. **Intent** — `intentClassifier` / RULES에 큐 추가, 충돌 시 `AIZIO_CURRENT_FLOW_MAP` 우선순위 존중  
3. **Entity** — 시간·인물·장소·항목 파싱; 실패 시 `needs_user_action`으로 되묻기  
4. **Skill adapter** — `isAvailable` / `canHandle` / `execute`만 구현; DOM 금지  
5. **Compose** — `message` + `speakText` + 필요 시 `uiActions`  
6. **테스트** — unit (파서·스킬) + 골든 문장 테스트  
7. **정직성** — 못 하면 `unavailable` + 이유 한 줄  
8. **문서** — Intent Catalog 행 갱신

#### 1.3 Phase 1에서 고의로 미룸

- Claude / 새 LLM 프로바이더  
- Health·Travel shell의 “AI 코치”  
- App Store 제출  

로컬 P0가 안 되면 AI를 붙여도 **비서처럼 느껴지지 않는다**.

---

### Phase 2 — Intent ↔ Skill 구멍 메우기

`AIZIO_INTENT_CATALOG.md`의 **Unavailable / honest** 항목을 하나씩 처리한다.

| 항목 | 권장 처치 | 완료 정의 |
|------|-----------|-----------|
| `update_todo` | 완료/삭제 파서 + 스킬 | “우유 할 일 완료”가 목록에서 사라짐 |
| `create_calendar_event` | **개인 일정** local store 추가 또는 가족 일정으로만 유도 | 저장 경로 문서화 + 동작 |
| `project_status` / planning | Life OS projects와 연결 **또는** unavailable 유지 | 이중 프로젝트 모델 금지 |
| AI intent classifier stub | 로컬 규칙 유지; LLM 분류는 **옵션·저신뢰만** | 토큰 낭비로 P0 깨지 않음 |

**충돌 규칙 (이미 안정화된 것 유지)**

- 「가족 일정」→ calendar (smart reminder 목록 금지)  
- 「봤어/완료」→ 알림/일정 cue 있을 때만 complete  
- 애매하면 `general_chat` → legacy / Hybrid (STT 에러로 포장 금지)

---

### Phase 3 — Hybrid AI를 “일상 대화”로

#### 3.1 사용자 설정 경로 (이미 있음 — 깨지지 않게)

설정 → AI 연결 → 키 저장 → 연결 테스트 → 자동 선택(OpenRouter → Gemini → Groq)

#### 3.2 자연 실행 보강 순서

1. **컨텍스트 슬림화** — 최근 대화 N턴 + 오늘 할 일/알람 요약만 프롬프트에  
2. **모드 분리** — `chat` / `planning` / `analysis` (AI Engine)를 intent에 매핑  
3. **로컬 miss 후에만** `runHybridChat` (스킬이 이미 성공했으면 LLM 호출 금지)  
4. **실패 메시지** — 쿼터/키 오류를 사용자 언어로 (개발자 스택 금지)  
5. **유료 폴백** 기본 OFF 유지

#### 3.3 Claude 등 추가 Provider (이 단계에서 “추가”만)

작업 순서:

1. `src/ai-providers/providers/`에 Anthropic(또는 OpenAI-compatible Claude 엔드포인트) 어댑터  
2. `providerRegistry` / `models.ts` / 설정 UI 항목  
3. **용도 매핑** (다음 Phase 4와 공유):

| 용도 | 1순위 | 2순위 |
|------|-------|-------|
| 짧은 잡담·분류 | Groq / Gemini | OpenRouter free |
| 계획·회의·긴 글 | Claude | OpenAI |
| 코드/구조화 JSON | Claude / GPT | Gemini |
| 이미지 이해 | Gemini Vision / Claude Vision | — |

---

### Phase 4 — 분야별 전문가 접목

LLM이 **대신하면 안 되는 것**과 **해야 하는 것**을 나눈다.

| 분야 | 사실/액션 소스 | LLM 역할 | 접목 순서 |
|------|----------------|----------|-----------|
| 투자 시세 | Yahoo 등 | 숫자 해설·리스크 문구 | 1. 시세 안정 2. 해설 프롬프트 |
| 번역 | MyMemory → DeepL/Google | 톤 다듬기(옵션) | 1. DeepL 키 배선 2. 통역 모드 |
| 지도·내비 | Nominatim + 지도 앱 딥링크 | 여행 일정 문장 | ETA/턴바이턴 사칭 금지 |
| 음악 | 외부 앱 open | 추천 문장 | “재생됨” 가짜 금지 |
| 회의(AI Meeting) | 로컬 템플릿 + 1회 Hybrid | Claude 우선 요약 | Life OS 플래그와 함께 |
| 비전 | (미구현) Vision provider | 사진→메모/영수증 | Phase 4 후반 |

**파이프라인 패턴 (고급 기능에만)**

```
작은 모델/규칙로 의도 확정
  → 전문 API로 사실 수집 (시세·지오·번역)
  → Claude/GPT가 최종 문장 작성
  → Composer가 한 답으로 반환
```

일상 할 일·알람에는 이 패턴을 **쓰지 않는다** (지연·비용·실패면이 커짐).

---

### Phase 5 — Life OS를 “말로” 실행

UI shell을 없애는 순서 (권장):

| 순서 | 모듈 | 말로 하는 예 | Done 조건 |
|------|------|--------------|-----------|
| 1 | DNA | “내 생활 원칙에 건강 추가” | 저장 + 조회 문장 |
| 2 | Goals | “올해 목표 보여줘” | 목록/진행 |
| 3 | Ideas | “아이디어 적어: …” | 뱅크 저장 |
| 4 | Projects | “프로젝트 N 상태” | Life OS project와 단일화 |
| 5 | AI Meeting | “회의 정리해줘” + 붙여넣은 메모 | 템플릿 또는 1 AI 요약 |
| 6 | Routines / Timeline | “아침 루틴 시작” | 보수적 자동화만 |
| 7 | Emergency | “비상 연락” | 다이얼 안내; 자동 통화 금지 |
| 8 | Health/Finance/Travel/Learning | 로그만 유지하거나 **숨김** | shell을 Done처럼 홍보 금지 |
| 9 | Family Space (Life OS) | 기존 가족 탭과 역할 정리 | `serverLinked: false` 정직 표시 |

원칙: **Life OS는 Core Brain 스킬로만 음성 진입**. 새 하단 탭을 늘리지 말고 기존 Life/채팅으로 흡수.

---

### Phase 6 — 서버·푸시·백업 (약속 지키기)

| 항목 | 방법 | 합격 |
|------|------|------|
| 앱 종료 후 개인 알람 | `push-server` 배포 + 스케줄 API + 클라이언트 구독 | 실기기에서 백그라운드 알림 1회 이상 |
| 채팅 Web Push | 기존 VAPID 경로 점검 | 가족/친구 메시지 (홈화면 추가 전제) |
| 백업 | export/import에 relationships, smart reminders, `aizio_life_*` 포함 | 키는 strip, 복원 후 목록 일치 |
| 계정 동기화 | 당분간 **안 함** 또는 별도 에픽 | Guest local만 솔직히 고지 |

서버 없이 “푸시 완료”를 릴리즈 노트에 쓰지 않는다 (`AIZIO_RELEASE_CHECKLIST.md`).

---

### Phase 7 — 실기기·출시 게이트

1. `AIZIO_REAL_DEVICE_MASTER_TEST.md` / Life OS device test 실행  
2. `npm test` · `tsc --noEmit` · `npm run build`  
3. `AIZIO_RELEASE_CHECKLIST.md` 전 항목  
4. 배포는 **소유자 승인 후에만** `npm run deploy:web`  
5. 사용자 가이드에 “되는 것 / 안 되는 것” 표를 배포 버전과 동기화

---

## 4. 기능 하나를 Done으로 올리는 체크리스트 (복붙용)

```markdown
### Feature: _______________

- [ ] 일상 문장 5개 정의 (성공/애매/거절)
- [ ] Intent + Entity 경로 확인 (충돌 없음)
- [ ] Skill `available: true` 이고 실제 side-effect 있음
- [ ] 실패 시 status ≠ completed (정직)
- [ ] 음성·텍스트 동일 결과
- [ ] Unit/골든 테스트 추가
- [ ] Intent Catalog / Current State 라벨 갱신
- [ ] AI 키 없는 환경에서 로컬 경로 검증
- [ ] (해당 시) Provider 폴백·쿼터 메시지 검증
```

---

## 5. 멀티 AI 운영 표 (라우팅 방법서)

설정값 개념: `routeByIntent` (구현 시 Hybrid 설정에 추가).

| Intent 군 | 1차 | 2차 | LLM 금지 사항 |
|-----------|-----|-----|----------------|
| todo / note / reminder / relationship | 로컬 스킬 | — | 저장을 LLM에 맡기지 않음 |
| translate | 번역 API | 로컬 사전 | 없는 언어 “완료” 금지 |
| ask_information (시세) | Yahoo | Hybrid 해설 | 시세 숫자 환각 |
| geo / navigation | geo DB + 맵 링크 | Hybrid 여행 문장 | 실시간 ETA 사칭 |
| general_chat | Gemini/Groq | OpenRouter | — |
| summarize / planning / AI Meeting | Claude | OpenAI | 키 없으면 로컬 템플릿 |
| help / settings / nav | 로컬 | — | — |

**폴백 순서 (기본):** 로컬 스킬 → 무료 Hybrid → (사용자 ON 시) 유료/Claude.

---

## 6. 주간 실행 리듬 (팀이 아니어도)

| 요일 개념 | 할 일 |
|-----------|--------|
| 계획 | Phase 0 백로그에서 P0 최대 3개만 고른다 |
| 구현 | 스킬 루프(§3 Phase 1.2)만 반복 |
| 검증 | 골든 문장 + `npm test` |
| 정리 | Current State 라벨·Catalog·이 방법서 링크만 갱신 |
| 배포 | 승인 있을 때만 |

한 주에 shell 화면 3개를 만들기보다 **P0 문장 3개를 Done**으로 만드는 편이 비서를 살린다.

---

## 7. 금지 규칙 (품질 가드)

1. UI shell을 README/스토어에 “지원”으로 쓰지 않는다.  
2. `success: true`인데 저장·외부 액션이 없으면 머지하지 않는다.  
3. Core Brain을 우회하는 **두 번째 think 파이프라인**을 만들지 않는다.  
4. Provider 키를 번들·깃·백업 plaintext에 넣지 않는다.  
5. 투자·의료·법률·비상: 자동 실행·확정 조언 금지, 안전 정책 준수.  
6. “나중에 서버”를 전제로 클라이언트에 완료 UX를 넣지 않는다.

---

## 8. 즉시 착수 권장 순서 (현재 코드 기준)

코드베이스 공백을 반영한 **첫 스프린트 큐**:

| 순서 | 항목 | 이유 |
|------|------|------|
| 1 | `update_todo` + 개인 일정 create를 Partial/Done | 매일 쓰는 문장이 막혀 있음 |
| 2 | 골든 문장 테스트 파일 확대 (로컬 비서 P0) | 회귀 방지 |
| 3 | Hybrid 컨텍스트에 오늘 할 일/알람 요약 | 대화가 “내 비서”처럼 됨 |
| 4 | Claude provider + planning/meeting 라우팅 | 설계한 멀티 AI의 |
| 5 | DeepL 배선 (번역 Partial → 실용) | 통역 잠금과 연결 |
| 6 | AI Meeting을 Claude 우선 + 로컬 템플릿 폴백 | Life OS 핵심 경험 |
| 7 | push-server로 종료 후 알람 | 비서 신뢰의 마지막 축 |
| 8 | Health/Travel 등 shell은 숨기거나 “기록만” 라벨 | 기대치 오염 방지 |

---

## 9. 관련 문서

| 문서 | 쓸 때 |
|------|--------|
| `AIZIO_FULL_CURRENT_STATE.md` | 라벨 진실원 |
| `AIZIO_CURRENT_FLOW_MAP.md` | 파이프라인·충돌 규칙 |
| `AIZIO_CORE_BRAIN.md` / `AIZIO_SKILL_INTERFACE.md` | 스킬 구현 |
| `AIZIO_INTENT_CATALOG.md` | 문장↔intent |
| `AIZIO_AI_PROVIDER_GUIDE.md` / `AIZIO_PROVIDER_FALLBACK.md` | 키·폴백 |
| `AIZIO_LIFE_OS_ARCHITECTURE.md` | Life OS 범위 |
| `AIZIO_PUSH_SERVER_SETUP.md` | 종료 후 알림 |
| `AIZIO_RELEASE_CHECKLIST.md` | 출시 게이트 |
| `AIZIO_REAL_DEVICE_MASTER_TEST.md` | 실기기 |

---

## 10. 백로그 템플릿 (복사해서 새 파일로)

파일명 예: `docs/AIZIO_EXECUTION_BACKLOG.md`

```markdown
# AIZIO Execution Backlog

Updated: YYYY-MM-DD

## P0 — 매일 비서
- [ ] ...

## P1 — AI·번역·Life OS 음성
- [ ] ...

## P2 — 비전·스토어·동기화
- [ ] ...

## Done this week
- ...
```

---

**유지 방침:** 기능 라벨이 바뀌면 §8 큐와 Full Current State를 같은 PR에서 갱신한다.  
이 방법서가 “나중에 하자” 문서가 되지 않게, **머지 조건 = 체크리스트 §4 + 테스트**로 둔다.
