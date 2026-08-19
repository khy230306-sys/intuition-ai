# 스캐너 WebSocket 프로토콜

## 기본
앱은 설정된 `websocketUrl`로 WebSocket 연결을 시도하고, 아래 메시지 타입을 수신합니다.

## 메시지 타입(앱이 처리하는 것)
- `scanner_status`
- `round_result`
  - `tableId`, `roundId`, `roundIndex`, `timestamp`, `result`: 'PLAYER' | 'BANKER' | 'TIE'
- `balance_snapshot`
  - `tableId`, `roundIndex`, `timestamp`, `playerTotal`, `bankerTotal`, `tieTotal`, `meta?`
- `betting_open`, `betting_closed`
- `table_changed`
- `auto_bet_result`
- `scanner_error`
- `heartbeat`

## 앱→스캐너(자동배팅 명령)
- `auto_bet_cmd`
  - `tableId`, `roundIndex`, `side`, `amount`, `mode` ('ENTRY' | 'WAIT')

## Heartbeat(연결 확인)
- 앱은 연결 상태가 `CONNECTED`일 때 5초마다 heartbeat를 보냅니다.
- 마지막 수신 heartbeat가 15초 초과하면 DISCONNECTED로 표시합니다(안전 구조의 단순 구현).

## 개인정보/보안
- 이 앱 코드는 로그인/비밀번호/쿠키/토큰을 저장하지 않습니다.
- 실제 스캐너 구현은 이용약관/법률 준수 하에 별도 개발이 필요합니다.

