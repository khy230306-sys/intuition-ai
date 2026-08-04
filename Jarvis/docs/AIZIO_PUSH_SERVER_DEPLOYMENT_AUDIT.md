# AIZIO Push Server Deployment Audit

**Date:** 2026-08-03  
**Branch tip at audit start:** `9131e35` (`cursor/device-verify-push-6b16`)  
**Source of truth:** repository files (not speculation)

---

## Entry / runtime

| Item | Actual |
|------|--------|
| Entry | `Jarvis/push-server/server.mjs` |
| Start | `npm start` → `node server.mjs` |
| Module type | ESM (`"type": "module"`) |
| Dependency | `web-push@^3.6.7` |
| Node in this environment | **v22.14.0** (engines field was absent → adding `>=20`) |
| HTTP | Node `http.createServer` (TLS terminated by host) |

## Environment variables (pre-hardening)

| Var | Role |
|-----|------|
| `PORT` | Listen port (default `8787`) |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private |
| `VAPID_SUBJECT` | `mailto:` / `https:` contact |
| `DATA_DIR` | JSON store directory (default `./data`) |
| `AIZIO_CORS_ORIGIN` | CORS allow (default `*`) |

## Storage

- File: `{DATA_DIR}/store.json`
- Collections: `subscriptions[]`, `reminders[]`, `deliveries[]`
- Persists across process restart **if disk is durable**
- **Ephemeral hosts (Render free without disk):** file lost on redeploy — must re-subscribe

## Scheduler

- In-process `setInterval(..., 15_000)` calling `sendDue()`
- **Gap:** host sleep/cold-start stops the timer until traffic wakes the process
- Hardening adds `POST /v1/cron/tick` + catch-up on boot

## Routes (pre-hardening)

| Method | Path |
|--------|------|
| GET | `/health` |
| POST | `/v1/push/subscribe` |
| POST | `/v1/push/unsubscribe` |
| POST | `/v1/reminders/schedule` |
| POST | `/v1/reminders/update` |
| POST | `/v1/reminders/cancel` |
| GET | `/v1/reminders/status/:id` |

## Client wiring

| Piece | Path |
|-------|------|
| SW push/click | `public/push-handler.js` |
| Reminder client | `src/push/reminderPushClient.ts` |
| Server URL key | `localStorage` `aizio.push.serverBaseUrl.v1` + settings `pushServerBaseUrl` |
| Smart reminder sync | `src/smartReminder/pushSync.ts` |
| VAPID public (subscribe) | `src/vapid.ts` |
| **Issue found** | `VAPID_PRIVATE_KEY` was exported from `src/vapid.ts` and used in `chatNotify.ts` for client-side peer push — **removed from frontend**; chat relay moves to server when URL configured |

## Preview vs production

| | Preview | Production |
|--|---------|------------|
| App URL | ShipStatic snapshot (`deploy:preview`) | `jarvis-app.shipstatic.com` |
| Domain repoint | **No** | Only `deploy:web` (forbidden this task) |
| Push server default | `public/preview-config.json` / build-meta (preview channel) | Must stay unset or previous value — **do not change prod deploy** |

## Platform choice (this iteration)

**Render Free Web Service** selected for:

- HTTPS included, no credit card for free tier (per Render docs)
- Node runtime + env vars
- Git-connected deploy from this repo’s `push-server/`

**Trade-offs documented:** spin-down after ~15m idle → cron keep-alive/tick required; filesystem not durable across redeploy without disk → JSON + optional volume / re-subscribe after deploy.

---

## Gaps closed in hardening (this branch)

| Area | Implementation |
|------|----------------|
| Health | `ok`, `service`, `version`, `currentTime`, `uptime`, `storage`/`database`, `scheduler`, `vapidConfigured` — no secrets |
| CORS | `ALLOWED_ORIGINS` + defaults for prod/REVIEW/localhost; also `*.shipstatic.com` / `*.trycloudflare.com` |
| Validation | JSON body limits, https endpoints, required fields, structured errors |
| Dedup | Same userId+reminderId replaces prior schedule; deliveries dedupeKey blocks double-send |
| Past policy | >60s past → `expired` on schedule; send window last 24h else expire |
| 404/410 | Subscription removed on push failure |
| Rate limit | `RATE_LIMIT_PER_MIN` (default 120) |
| Persistence | `DATA_DIR/store.json` atomic write; survives process restart |
| Cron | `POST /v1/cron/tick` + 15s interval + boot catch-up |
| Chat relay | `POST /v1/push/send` — private key server-only |
| Status | Requires `?userId=` (cross-user unknown) |
| Client | Preview `preview-config.json` default URL; settings override; device-test panel |
| Secrets | Rotated VAPID; private key only in server `.env` (gitignored) |

**Deploy path:** Cloudflare Quick Tunnel for immediate HTTPS verify when platform login unavailable; Render blueprint (`render.yaml`) for durable free hosting (user connects GitHub + sets env).
