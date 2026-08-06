# AIZIO Offline Data Sync

## Outbox

Storage key: `aizio.offline.outbox.v1`

Fields: `operationId`, `entityType`, `entityId`, `action`, `payload`, `createdAt`, `retryCount`, `lastError`, `syncStatus`, `idempotencyKey`

Statuses: `local-only` · `pending` · `syncing` · `synced` · `conflict` · `failed`

## Flush rules

- Offline → no flush
- Online/degraded → local entities (calendar/todo/note/reminder/settings/translate-cache) mark `synced` (data already on device)
- Idempotency key prevents duplicate pending ops for the same entity/action
- Conflicts: do not silently overwrite; surface in 저장된 작업 UI (future keep-local / keep-remote)

## Reminder honesty

| Mode | Guarantee |
| --- | --- |
| App foreground | Local timers / in-app alerts possible |
| Server push | Requires push server + permission |
| iOS PWA fully quit without push | **Not guaranteed** — never claim otherwise |
