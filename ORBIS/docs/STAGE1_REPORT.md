# ORBIS Stage 1 Report

## 실제 구현 내용

- React + TypeScript + Vite 프로젝트 구성
- React Router 기반 Home / Brand / About / Settings / 404
- ORBIS 독창 로고(SVG), favicon, PWA 아이콘
- CORE + BLUE/GOLD/VIOLET Orb 궤도 애니메이션
- 모바일 햄버거 메뉴 / 데스크톱 내비게이션
- 설정 localStorage 저장
- 한국어/영어 i18n
- Web Audio API 효과음 (기본 무음)
- PWA manifest + service worker
- Vitest UI/설정/번역 테스트
- ESLint + Oxlint

## 테스트 결과

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 통과 (ESLint + Oxlint, 오류 0) |
| `npm run test` | 통과 (3 files / 8 tests) |
| `npm run build` | 통과 (TypeScript 오류 0, Vite production build 성공) |
| `npm run dev` | 실행 중 (`--host`, port 5173) |

검증 항목:

- 페이지 이동: Home / Brand / About / Settings / 404
- Stage 2 안내 모달
- 언어 전환 및 설정 저장
- PWA manifest 생성 (`dist/manifest.webmanifest`)

## 남은 문제

- 실제 iPhone Safari 노치/주소창 변화는 `100dvh`와 safe-area CSS로 대응했으며, 사용자 실기기 확인이 추가되면 더 정확합니다.
- 사운드는 브라우저 자동재생 정책상 사용자 제스처 이후 활성화됩니다.
- 클라우드/원격 환경에서는 Wi-Fi Network 주소가 사용자 로컬 LAN과 다를 수 있습니다.

## Stage 2에서 구현할 내용

- 체험 시작 후 실제 라운드/게임 시스템 연결
- 게임 결과 생성 및 연출
- 포인트 / 배당 / 베팅 로직 (금전 거래 없는 체험형)
- 결과 리플레이와 스토리 연출 확장
- 필요 시 관리/디버그용 내부 도구 (실제 금전/외부 도박 연결 제외)
