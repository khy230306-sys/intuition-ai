# AIZIO Push Server

HTTPS-ready Node Web Push service for smart reminders + chat relay.
VAPID **private** key stays in server env only — never in the app bundle.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Status (ok, storage, scheduler, vapidConfigured) |
| POST | `/v1/cron/tick` | Wake scheduler (optional `X-Cron-Secret`) |
| POST | `/v1/push/subscribe` | Register device subscription |
| POST | `/v1/push/unsubscribe` | Remove subscription |
| POST | `/v1/push/send` | Chat relay (server-side VAPID) |
| POST | `/v1/reminders/schedule` | Schedule reminder |
| POST | `/v1/reminders/update` | Update schedule |
| POST | `/v1/reminders/cancel` | Cancel |
| GET | `/v1/reminders/status/:id?userId=` | Status (user-scoped) |

## Environment

Copy `.env.example` → `.env` (gitignored). Required for send:

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
- `ALLOWED_ORIGINS` — REVIEW + production + localhost
- `PORT`, `DATA_DIR`, optional `CRON_SECRET`, `INSTALL_TOKEN`

Public key in app: `Jarvis/src/vapid.ts` must match server public key.

## Local

```bash
cd Jarvis/push-server
npm install
npm start
npm test
```

## Deploy (Render blueprint)

`render.yaml` — Web Service + optional cron to `/v1/cron/tick`.
Set env in dashboard (do not commit secrets). Free tier sleeps ~15m → cron required for reliable delivery.

JSON file store survives process restart on durable disk; ephemeral redeploys need re-subscribe.

## Security

- CORS allowlist (+ `*.shipstatic.com` / `*.trycloudflare.com` helpers)
- Rate limit, body size limit, https endpoints only
- Logs mask ids; never log full endpoints/keys
- Status requires `userId`
