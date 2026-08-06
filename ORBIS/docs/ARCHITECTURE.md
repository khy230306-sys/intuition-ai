# ORBIS Architecture (Stage 1)

## 프로젝트 구조

```text
src/
  app/           # App shell, router, sound helpers
  brand/         # Logo, brand tokens
  components/    # Header, Button, Modal, MobileMenu
  pages/         # Home, Brand, About, Settings, 404
  layout/        # AppLayout
  animation/     # OrbStage, parallax, visibility hooks
  i18n/          # ko/en dictionaries + provider
  storage/       # settings load/save + context
  styles/        # global / variables
  tests/         # Vitest suites
```

## 주요 컴포넌트

- `OrbStage`: CORE, 궤도, Orb, 별, Nebula 애니메이션
- `Header` / `MobileMenu`: 반응형 내비게이션
- `Modal`: Stage 2 안내 및 공통 모달
- `SettingsProvider`: 언어/사운드/품질/모션 감소 상태
- `I18nProvider`: 설정 언어에 따른 사전 제공

## 설정 저장 방식

- Key: `orbis.settings.v1`
- Storage: `localStorage`
- 값: `language`, `soundEnabled`, `animationQuality`, `reduceMotion`
- 앱 시작 시 로드, 변경 시 즉시 저장

## 애니메이션 구조

- CSS `@keyframes` + `transform` / `opacity` 우선
- 품질 설정:
  - Low: 별/잔상 축소
  - Medium: 기본
  - High: 별 수와 parallax 강화
- `prefers-reduced-motion` 및 사용자 모션 감소 옵션 지원
- 탭 비활성화 시 `animation-play-state: paused`

## 사운드

- Web Audio API로 짧은 전자음 생성
- 기본 무음
- 사용자 토글 이후에만 클릭음 / CORE 활성화음 재생

## PWA

- `vite-plugin-pwa`
- manifest 이름: ORBIS
- theme/background: `#05070f`
- 오프라인 시 정적 브랜드 화면 제공을 위한 precache

## 현재 게임: CORE TRINITY

- 경로: `/play`
- 엔진: `src/game/trinity/`
- 흐름: 선택(BLUE/GOLD/VIOLET/VOID) → CORE 열기 → 3 Orb 순차 공개 → 정산
- 결과 패턴: majority / trinity / void
- 저장: 데모 에너지 + 공명 로드 (`localStorage`)

## 확장 지점

1. 특수 패턴(더블 공명, 연속 VOID 등) 추가
2. 연출/스토리 레이어 강화
3. 서버 시드 검증이 필요하면 `engine`과 API 계층 분리

실제 입출금, 환전, 결제, 외부 베팅 연결은 구현하지 않습니다.
