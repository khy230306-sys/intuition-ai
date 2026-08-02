# AIZIO Current Flow Map (Core Stability)

Checkpoint: `cursor/core-stability-integration-6b16` · app **1.13.1**

## Single input pipeline

```
Text send / suggest chip / translate chip
  OR Voice MIC onFinal / MIC STOP partial
    → main.handleUserText(text, { source: 'text' | 'voice' })
      → pushMsg(user) + saveChat
      → brain.think(text, history, { source })
          → stripWakeWord
          → processCoreBrain({ text, history, locale, source })
              → classifyIntent (relationship → reminder → casual → music → RULES → general_chat)
              → shouldExecuteViaSkills (≥0.72 + SKILL_OWNED)
              → Skill lazy load OR fallbackLegacy
          → if Core BrainReply: return
          → else legacy think chain:
              everyday → music(retry if needed) → games/family → invest/life/geo/translate
              → runHybridChat (if any provider configured)
              → casual / STT garbage / soft unknown
      → pushMsg(assistant) + optional speakAsync + optional reply.action()
```

Voice and text share **one** pipeline. Space (family/friends) mics do **not** enter Jarvis `think`.

## Intent priority (actual)

1. Empty / unsafe
2. Relationship memory (`parseRelationshipUtterance`)
3. Smart reminder (`parseReminderUtterance`) — narrowed so 「가족 일정」/bare「완료」 do not steal
4. Casual / social → `general_chat`
5. Music classifier
6. RULES (settings, nav, translate, notes, todos, calendar incl. 가족 일정, project, summarize, ask_information@0.55)
7. Soft `general_chat` (0.4) → legacy + hybrid AI

`unknown` from empty only. Soft text → `general_chat`, never STT-error.

## Skill Registry (lazy)

| Skill | Available | Notes |
|-------|-----------|--------|
| music | yes | Primary path; prepare ≠ playing |
| translation | yes | |
| note / todo | yes | todo → `jarvis_reminders_v1` |
| calendar | yes | list merges family/friends; create may be unavailable |
| relationship | yes | `jarvis_relationships_v1` |
| smartReminder | yes | `jarvis_smart_reminders_v1` + local alarms |
| settings / navigation | yes | |
| project | **no** | honest unavailable |
| help / chat | registered | help/chat defer to legacy by design |

## AI vs local

- Local skills: notes, todos, calendar list, relationships, reminders, settings, nav, music control
- Hybrid AI (`runHybridChat`): free chat / analysis after legacy miss — OpenRouter → Gemini → Groq; paid off by default
- No provider → local features still work; free chat gets configure message

## Storage ownership

| Data | Key |
|------|-----|
| Chat | `jarvis_chat_v1` |
| Settings | `jarvis_settings_v1` |
| Hybrid AI keys | `jarvis_hybrid_ai_v1` (obfuscated; backup strips secrets) |
| Relationships | `jarvis_relationships_v1` |
| Smart reminders | `jarvis_smart_reminders_v1` |
| Reminder context | `jarvis_smart_reminder_ctx_v1` |
| Local alarms | `jarvis_local_alarms_v1` |
| Legacy todos | `jarvis_reminders_v1` |
| Notes | `jarvis_memory_v1` |
| Music session | `jarvis.music.session.v1` |

## Duplicate / risk paths (stabilized)

| Issue | Resolution |
|-------|------------|
| 「가족 일정」 → smart list | Reminder list requires 알림/리마인더 cues; calendar RULE owns 가족 일정 |
| 「봤어/완료」 → mark complete | Requires 알림/일정/예약 cue |
| Dual music (Core + legacy) | Legacy music only if Core did not claim, or onlyFailed retry |
| `status: playing` dishonest | Requested playback → `ready` + honest copy |
| SW update interval stack | Single guarded `setInterval` |
| Social turn clears music follow-up | Soft social does not overwrite sticky skill intent |

## Dead / deferred (kept, documented)

- `helpSkillAdapter` / `chatSkillAdapter` — not primary executors (legacy help / AI path)
- In-app `playing` branch — providers open external; status stays `opened_external` / `ready`
- Closed-app personal reminder push — needs server; **not complete**

## Notifications

- **App open:** `notify.ts` timers + 15s catch-up interval
- **App closed personal push:** not implemented for smart reminders (chat Web Push is separate)
