# AIZIO Action Planner

## Purpose

Split one utterance into ordered tasks, then execute **sequentially** via existing `think()` (each segment still goes through Core Brain / legacy).

## Example

Input:

> 2시에 엄마 병원 예약하고 끝나면 조용한 음악 틀어줘.

Plan:

1. Calendar / family schedule task  
2. Music task  

## Connectors

`그리고`, `하고`, `끝나면`, `다음에`, commas, newlines, etc.

## Ordering

When kinds differ: family → calendar → reminder → navigation → project → routine → idea → music → chat.

## Non-goals

- Does not invent missing intents.
- Does not bypass Core Brain safety.
- Single-kind or simple chat stays `multiTask: false`.

## API

- `planActions(text)` → `AieActionPlan`
- `formatActionPlanSummary(plan)`
- Orchestrator sets `shouldRunMultiTask` when ≥2 distinct kinds.
