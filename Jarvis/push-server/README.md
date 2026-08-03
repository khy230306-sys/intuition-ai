# AIZIO Push Server (template)

최소 Web Push 서버. **운영 계정·호스팅은 사용자가 선택·승인해야 합니다.**

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/push/subscribe` | 기기 구독 등록 |
| POST | `/v1/push/unsubscribe` | 구독 해제 |
| POST | `/v1/reminders/schedule` | 리마인더 예약 |
| POST | `/v1/reminders/update` | 예약 수정 |
| POST | `/v1/reminders/cancel` | 예약 취소 |
| GET | `/v1/reminders/status/:id` | 상태 조회 |
| GET | `/health` | 헬스체크 |

## 환경변수

```bash
PORT=8787
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
DATA_DIR=./data
AIZIO_CORS_ORIGIN=*
```

VAPID 키는 앱의 `src/vapid.ts` 공개키와 **쌍**이어야 합니다. 운영 시 서버 전용 키 쌍을 새로 만들고 앱 공개키를 맞추는 것을 권장합니다.

## 로컬 실행

```bash
cd Jarvis/push-server
npm install
VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... npm start
```

앱 설정 → **푸시 서버 URL**에 `http://127.0.0.1:8787` (실기기는 PC LAN IP + HTTPS/터널 필요).

## 배포 후보 (계정 생성은 사용자)

| 후보 | 무료 범위(대략) | 비고 |
|------|-----------------|------|
| Cloudflare Workers + KV/D1 | 관대한 무료 | cron trigger 필요 |
| Fly.io | 소형 VM 무료/저가 | Node 그대로 |
| Railway / Render | 체험·저가 | sleep 가능 |
| 가정 NAS / VPS | 고정비 | HTTPS 필수 |

## 체크리스트 (연결 전)

- [ ] VAPID 키 쌍 준비
- [ ] HTTPS 엔드포인트
- [ ] CORS에 PWA origin 허용
- [ ] 앱 설정에 서버 URL 입력
- [ ] subscribe → schedule → 앱 완전 종료 후 수신 확인 (실기기)
- [ ] 만료 구독(410) 제거 동작 확인

## 스키마 (파일 스토어)

`data/store.json`:

- `subscriptions[]` — userId, deviceId, endpoint, keys, timezone
- `reminders[]` — scheduledAt, privacyMode, dedupeKey, status
- `deliveries[]` — dedupeKey, status (중복 발송 방지)

SQLite/Postgres로 교체 가능. 템플릿은 JSON 파일입니다.
