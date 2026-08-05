# AIZIO Recommendation Engine

## Purpose

Compute **proactive** suggestion candidates from Context without a user command.

## Examples

- “오늘 일정이 있습니다.”
- “출발·이동이 포함된 일정이 있습니다…”
- “프로젝트가 N일째 멈춰 있습니다.”
- “목표 진행률이 낮습니다.”
- Offline / no AI Provider hints

## ON / OFF

Controlled by Life OS flag:

`proactiveSuggestionsEnabled` (default **false**)

See `src/life-os/featureFlags.ts`.

## Learning

| Signal | Effect |
|--------|--------|
| Frequent ignore | Lower priority → hard suppress after 5 |
| Frequent skill use | Mild priority boost |
| Forgotten DNA | Never re-suggest matching text |

Storage keys: `aizio_aie_learning_v1`, `aizio_aie_forgotten_v1`.

## Attach point

`aieEnrichAnswer()` may append a short “AIE 추천” block after Core Brain / chat replies when the flag is ON.
