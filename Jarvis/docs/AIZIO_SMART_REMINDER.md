# AIZIO Smart Reminder Skill

Natural-language appointments linked to Relationship Memory.

## Storage

`jarvis_smart_reminders_v1` (localStorage). Alarms via existing `notify.ts` `scheduleAlarm`.

## Examples

- 「오늘 오후 2시에 엄마 병원 진찰 예약 있어.」
- 「30분 전에도 알려줘.」(follow-up on last reminder)
- 「엄마 오늘 일정 뭐야?」
- 「취소해줘」 / 「10분 뒤 다시 알려줘」

## Past times

If the spoken time is already past, the event is stored as `missed` / `skipped_past` — **not** rolled to tomorrow.
