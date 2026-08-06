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

## Stage 2 확장 지점

1. `HomePage`의 Stage 2 모달 자리에 실제 체험/라운드 진입 연결
2. `src/game/` (신규) 영역에 라운드 상태, 결과, 포인트 로직 추가
3. 설정에 게임 관련 옵션 확장
4. 서버/상태 관리가 필요해질 경우 `storage`와 분리된 API 계층 추가

Stage 1에서는 베팅, 입출금, 환전, 결제, 배당, 결과 생성, 관리자 조작을 구현하지 않습니다.
