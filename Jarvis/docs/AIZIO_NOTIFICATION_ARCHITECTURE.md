# AIZIO Notification Architecture

## App open (implemented)

- `notify.ts`: `scheduleAlarm` + `setTimeout` + 15s miss catch
- Browser `Notification` when permission is `granted`
- In-chat bubble via `setAlarmUiHandler` in `main.ts`
- Optional vibration

## App closed (not claimed as complete)

Personal Smart Reminders do **not** use Web Push today.

Existing Web Push (`vapid.ts`, `chatNotify.ts`, `push-handler.js`) is for **family/friends chat** only.

Closed-app personal reminder delivery needs:

1. Push subscription for reminder channel
2. Server-side schedule / cron
3. Payload send at `scheduledAt`

Until that exists, product copy states: alerts are most reliable while the PWA is open.
