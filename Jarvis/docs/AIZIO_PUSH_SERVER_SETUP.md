# AIZIO Push Server Setup

## 현재 상태

| 항목 | 상태 |
|------|------|
| Client API 계약 | 구현 (`src/push/*`) |
| Smart Reminder 연결 | 구현 (서버 URL 있을 때 schedule/update/cancel) |
| Service Worker | reminder/chat 구분 |
| 서버 템플릿 | `Jarvis/push-server/` |
| 운영 서버 | **없음** — 사용자 계정·호스팅 필요 |
| 앱 종료 푸시 실기기 검증 | **미확인** |

프로덕션 `jarvis-app.shipstatic.com`은 정적 호스팅만 제공합니다. Push 서버는 별도 호스트가 필요합니다.

## 앱 연결

1. `push-server` 실행 또는 배포
2. 설정 → 푸시 서버 URL 입력 → 저장
3. 「알림 권한 · 백그라운드 푸시 켜기」
4. 스마트 일정 생성 → 카드/응답에 `푸시 예약 완료` 또는 `서버 미연결` 표시 확인

서버 실패 시 로컬 일정·앱 열린 알림은 유지되며, 완료로 거짓 표시하지 않습니다.
