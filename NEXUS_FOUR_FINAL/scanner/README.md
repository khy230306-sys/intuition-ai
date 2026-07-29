# 스캐너 연동 (nexus_scanner.py)

앱은 카지노 사이트에 직접 붙지 않습니다.  
**WebSocket 스캐너**가 결과/`balance_snapshot`을 보내면 앱이 수신·분석합니다.

## 로컬 테스트 스캐너 실행

```bash
cd /workspace/NEXUS_FOUR_FINAL
pip3 install --user websockets
python3 scanner/nexus_scanner.py --host 0.0.0.0 --port 8765 --simulate
```

- `--simulate`: 약 8초마다 테스트용 PLAYER/BANKER/TIE + 밸런스 스냅샷 송신
- 실제 사이트 로그인/클릭은 하지 않습니다

## 앱에서 연결

1. 브라우저에서 `http://localhost:5173/` 접속
2. **웹사이트 / 스캐너 연동** 카드에서 **연결** 클릭
3. WebSocket URL은 기본값 `auto`  
   → `ws://현재호스트/scanner-ws` (Vite가 `8765`로 프록시)

상태 표시가 `연결됨`이고, 최근 결과에 시뮬레이션 라운드가 쌓이면 연동 성공입니다.

## 실제 사이트 연동

별도 스캐너가 아래 메시지를 보내야 합니다.

- `round_result`
- `balance_snapshot`
- `betting_open` / `betting_closed`
- `heartbeat`

로그인·비밀번호·쿠키는 앱에 저장하지 않습니다.
