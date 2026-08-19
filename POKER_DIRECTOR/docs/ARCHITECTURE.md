# Architecture

## 개요

POKER DIRECTOR는 Vite + React SPA입니다. 비즈니스 상태는 Zustand 스토어에 두고, IndexedDB/localStorage에 스냅샷으로 저장합니다. Supabase 환경변수가 있으면 클라우드 동기화 인터페이스를 사용합니다.

## 레이어

1. **UI** (`src/features/*`, `src/components/*`) — 화면/컴포넌트
2. **Hooks** (`src/hooks/*`) — 토너먼트 파생 데이터, 타이머 알림
3. **Store** (`src/stores/appStore.ts`) — 도메인 액션과 감사 로그
4. **Utils** (`src/utils/*`) — 타이머/좌석/밸런싱/상금 순수 로직
5. **Services** (`src/services/*`) — 로컬 저장소, Supabase, sync
6. **Types** (`src/types`) — 공통 데이터 모델

## 타이머

- `levelEndsAt` 절대 시각 기준 잔여시간 계산
- pause 시 `pausedRemainingMs` 저장
- 250ms 틱으로 만료 시 레벨 자동 진행
- TV/플레이어 화면은 조회 전용, 조작은 admin/director만

## 오프라인 / 동기화

- 기본: 로컬 우선 저장
- 클라우드: `app_snapshots` upsert/pull
- 충돌 시 사용자에게 로컬/원격 선택 UI 제공
