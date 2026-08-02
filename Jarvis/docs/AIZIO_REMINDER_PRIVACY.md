# AIZIO Reminder Privacy

- Relationship + smart reminder data stay in **device localStorage** (`jarvis_relationships_v1`, `jarvis_smart_reminders_v1`).
- No phone numbers / addresses / diagnoses are stored by these skills.
- Medical appointment titles are user-authored text only; AIZIO does not infer diagnoses.
- Notification preview modes: `full` (default) | `simple` | `hidden` on each reminder record.
- Do not send full medical detail to cloud AI for this skill path (local parse + Core Brain skill).
