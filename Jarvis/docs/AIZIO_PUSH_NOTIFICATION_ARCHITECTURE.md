# AIZIO Push Notification Architecture

## Honest status

| Channel | App open | Background / closed |
|---------|----------|---------------------|
| Smart Reminders (personal) | **Implemented** — `notify.ts` timers | **Not complete** — needs push server + schedule |
| Family / friends chat | Foreground Notification | **Client Web Push** — `chatNotify.ts` + VAPID + `push-handler.js` |

This document describes the **foundation** for closed-app personal reminders.  
**Do not treat personal closed-app push as finished** until a server is configured and verified on real devices.

---

## Existing pieces (client)

1. `public/push-handler.js` — SW `push` + `notificationclick` (chat + **reminder** kind)
2. `src/chatNotify.ts` — chat subscription + VAPID send helpers (peer-assisted)
3. `src/notify.ts` — local `setTimeout` alarms while the document is alive
4. `src/push/reminderPushClient.ts` — local subscription record + optional server upsert
5. `src/push/reminderPushTypes.ts` — API contracts & schema

---

## Required server (missing by default)

```
POST   /v1/push/subscriptions     — upsert device subscription (userId, deviceId, channels, timezone)
DELETE /v1/push/subscriptions     — remove expired / user opt-out
POST   /v1/reminders/schedule     — store ScheduledReminderPush (dedupeKey)
POST   /v1/reminders/cancel       — cancel by reminderId / dedupeKey
GET    /v1/push/failures          — dead endpoints / send errors
Worker/cron                       — fire due rows via Web Push (VAPID)
```

Schema types live in `src/push/reminderPushTypes.ts`.

---

## Client flow (when server URL is set)

1. User grants Notification permission (user action)
2. `ensureReminderPushSubscription()` stores endpoint keys under `aizio.push.reminderSubscription.v1`
3. If `aizio.push.serverBaseUrl.v1` is set → POST subscription to server
4. On reminder create/update/cancel → client calls schedule/cancel APIs (**not wired to smartReminder yet** — await server)
5. SW receives payload `{ kind: 'reminder', view, reminderId, title, body }`
6. Click opens `?view=chat|life&reminderId=`

Without server URL: step 3–4 skip; UI states foundation only.

---

## Deduping & expiry

- `dedupeKey = userId + reminderId + fireAt`
- Cancel before reschedule on edit
- Drop subscriptions on 404/410 from push service
- Never send duplicate notifications for the same dedupeKey after `status=sent`

---

## Timezone

- Client sends IANA timezone from `Intl`
- Server must compute fire time in that zone; store UTC `fireAt`

---

## Privacy

- Push body should avoid sensitive medical/financial detail when possible
- Prefer short titles; full detail after app unlock
- API keys never in push payloads

---

## Verification checklist

- [ ] Server URL configured
- [ ] Subscription `serverRegisteredAt` set
- [ ] Schedule row created for a test reminder
- [ ] App fully quit on iPhone Home Screen PWA → notification arrives
- [ ] Android Chrome → same
- [ ] Edit/cancel syncs
- [ ] Expired endpoint removed

Until checked on device: mark **실기기 미확인**.
