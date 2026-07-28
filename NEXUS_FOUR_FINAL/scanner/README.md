# nexus_scanner.py (스캐너 스텁)

이 저장소에는 본래 “브라우저 DOM 관찰/자동 입력”을 담당하는 **실제 스캐너**가 필요하지만,
현재 작업 환경에서는 외부 사이트 자동화/로그인 권한을 제공받지 못했기 때문에,
요구된 WebSocket 프로토콜을 검증할 수 있는 **로컬 테스트 스캐너 스텁**을 제공합니다.

## 동작
- WebSocket 서버를 실행하고 heartbeat를 처리합니다.
- `auto_bet_cmd`를 수신하면 `auto_bet_result`로 ACK만 반환합니다.

## 사용 예
```bash
pip install websockets
python scanner/nexus_scanner.py --port 8765
```

## 주의
- 본 스텁은 외부 카지노 사이트를 자동화하지 않습니다.
- 실제 자동배팅은 이용약관/법률을 준수하는 별도 스캐너 구현이 필요합니다.

