# AIZIO Core Engine V1

Orchestrates **REAL** tools only. External LLMs are optional parts later — V1 is deterministic tool command.

## V1 success criteria (one conversation)

1. `내일 울산 비 와?` → Open-Meteo daily forecast  
2. `비 안 오면 아이들이랑 갈 만한 곳 찾아줘.` → place search / curated public spots (never DEMO restaurant)  
3. `두 번째가 괜찮네.` → session memory select  
4. `토요일 오후 2시에 일정 잡아줘.` → `addReminder` + verify in storage  

## Non-goals (V1)

- Own LLM / model training  
- Travel booking, Gmail, payments  
- Fake DEMO catalogs  

## Entry

`tryHandleAizioEngine(text)` from `brain.ts` after Command Router, before Life Assistant.
