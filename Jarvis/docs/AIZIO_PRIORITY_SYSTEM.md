# AIZIO Priority System

AIZIO Intelligence Engine (AIE) uses two ordered lists.

## Decision Engine (STEP1 → STEP9)

| Step | Name | Meaning |
|------|------|---------|
| STEP1 | Emergency | Distress / 119 / medical-crime cues |
| STEP2 | In progress | Active music session, pending nav candidates |
| STEP3 | User command | Explicit utterance routed to Core Brain / legacy |
| STEP4 | Today schedule | Reminders / calendar focus |
| STEP5 | Project | Active or stalled projects |
| STEP6 | Family | Family profiles / notices |
| STEP7 | Routine | Routine phrase triggers |
| STEP8 | AI Provider | Provider missing / offline routing |
| STEP9 | Recommendation | Proactive suggestions (opt-in) |

Source of truth: `src/aie/priority.ts` → `DECISION_STEP_ORDER`.

## Smart Priority (concurrent events)

When multiple event types fire together:

1. Hospital appointment  
2. Family urgent  
3. Urgent alert  
4. User command  
5. Recommendation  

Source of truth: `src/aie/priority.ts` → `SMART_PRIORITY_ORDER`.

## Rules

- Lower index = higher priority.
- AIE ranks only; Core Brain / Skills still execute.
- Emergency never auto-calls or auto-shares location.
