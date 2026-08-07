# AIZIO Core Engine V1.1

Orchestrates **REAL** tools with structured context, standardized results, verification, and permissions.

## Loop

`의도 분류 → Session Context → Permission → ToolResult → Verifier → Reply`

## V1 success criteria (unchanged)

1. Weather (Open-Meteo)  
2. Family places (no DEMO restaurant)  
3. Ordinal / anaphora select  
4. Local calendar write + re-read verify  

## V1.1 modules

| Module | Role |
|--------|------|
| `context.ts` | Goal, places, selected, dateTime, lastTools, anaphora |
| `toolResult.ts` | Common ToolResult (`isRealData`, never for LLM text) |
| `verifier.ts` | Re-check weather/places/calendar before success copy |
| `permission.ts` | LEVEL 0–3; L2–3 → PENDING_EXTERNAL_SETUP |

## Permission

- **0** read/search — weather, places  
- **1** local write — in-app reminders  
- **2** external write — not connected  
- **3** sensitive — never without confirm + connector  

## Non-goals

Own LLM · Gmail · flight/hotel booking · payments · UI redesign  
