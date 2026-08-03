# 푸시 서버 내구성 배포 (사용자 작업)

에이전트 환경에서는 **Cloudflare Quick Tunnel**로 HTTPS 검증을 진행할 수 있습니다.  
터널 URL은 VM/프로세스가 끝나면 사라지므로, 실기기 장기 검증·운영에는 **Render(또는 동급)** 배포가 필요합니다.

## 권장: Render Free Web Service

1. [https://render.com](https://render.com) 로그인 (GitHub 연결)
2. **New → Blueprint** → 이 저장소 선택 → `Jarvis/push-server/render.yaml` 인식
   - 또는 **Web Service** 수동 생성:
     - Root Directory: `Jarvis/push-server`
     - Build: `npm install`
     - Start: `npm start`
     - Instance: Free
3. Environment (대시보드에만 입력 — 채팅/Git에 붙이지 말 것):
   - `VAPID_PUBLIC_KEY` = 앱 `src/vapid.ts`의 공개키와 **동일**
   - `VAPID_PRIVATE_KEY` = 로컬 `push-server/.env`에 있는 값 (본인만 복사)
   - `VAPID_SUBJECT` = `mailto:…`
   - `ALLOWED_ORIGINS` =  
     `https://jarvis-app.shipstatic.com,https://harmonic-rift-5oo4f3w.shipstatic.com,<새 REVIEW_URL>,http://localhost:5173`
   - `NODE_ENV` = `production`
   - 선택: `CRON_SECRET` 설정 후 Cron Job → `POST https://<service>/v1/cron/tick` (15분마다)
4. Deploy 후 `https://<service>.onrender.com/health` 확인
5. 에이전트/로컬에서 Preview 재배포:
   ```bash
   cd Jarvis
   PUSH_SERVER_URL=https://<service>.onrender.com npm run deploy:preview
   ```
6. **프로덕션 `deploy:web`는 실행하지 않음**

## 로컬 `.env`에서 비밀키 복사하는 방법

```bash
cd Jarvis/push-server
# 공개키만 확인 (비밀키는 터미널에 길게 출력하지 말고 Render 입력란에 붙여넣기)
grep '^VAPID_PUBLIC_KEY=' .env
```

비밀키는 `grep '^VAPID_PRIVATE_KEY=' .env` 결과를 Render 환경변수 칸에만 붙여넣으세요.
