# NEXUS FOUR FINAL 아키텍처

## 개요
NEXUS FOUR FINAL은 다음 3개 축으로 구성됩니다.

1. **React + TypeScript (Vite) UI**
   - 다크 테마, 한국어 UI
   - 데이터 입력(PLAYER/BANKER/TIE), Undo, 새 슈
   - IndexedDB 기반 영구 저장/복원
   - PWA 설치/오프라인 캐싱
2. **엔진/선택 로직 (TypeScript)**
   - 1번/2번/3번 엔진
   - 랜덤 기준 엔진(재현 가능한 seed)
   - AI 밸런스 엔진(밸런스 스냅샷 기반 조건부 ENTRY/WAIT)
   - 종합 멀티 엔진(엔진 성과 비교 + Wilson 95% 하한 기반 점수 + 히스테리시스)
3. **마틴 시스템 (TypeScript)**
   - ENTRY 신호 시 사이클 시작
   - 실패 시 단계 상승, 성공 시 즉시 종료/1단계 복귀
   - TIE는 손익 0 처리(스텝 유지)
   - 목표 수익/손실 한도 등 안전 정지

## 기존 NEXUS v3 보존 정책
- 이 작업 환경에서 **기존 NEXUS FOUR v3 소스/`nexus_v3.zip`을 찾지 못했습니다.**
- 따라서 “기존 기능 삭제 없이 보존”은 원본 소스 확보 후에는 동일 방식으로 수행 가능하지만,
  현재는 스펙에 맞춰 **새 프로젝트를 구현**했습니다.

## 실행 흐름(핵심)
1. 앱 시작
   - IndexedDB에서 저장된 게임 결과/설정 로드
   - 분석 엔진을 **전체 히스토리로 replay**하여 최신 “다음 라운드 예측”과 엔진 점수를 즉시 생성
2. 사용자가 PLAYER/BANKER/TIE를 입력
   - 동일 데이터 파이프라인으로 RoundResult 저장 → 분석/점수/마틴 상태 재구성
3. (선택) WebSocket 스캐너 연결
   - `round_result`, `balance_snapshot` 수신 시 동일 저장소/분석 파이프라인으로 반영

## 저장/백업
- Dexie(IndexedDB) 기본 저장소
- UI에서 JSON 백업/복원 제공

