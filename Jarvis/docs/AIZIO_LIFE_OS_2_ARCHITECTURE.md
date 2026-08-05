# AIZIO Life OS 2.0 Architecture

## Role

Life OS 2.0 connects existing Core Brain, AIE, Life OS 1.x, Navigation, Music, Relationship, Goals, Projects into a **daily living flow**. It does **not** rewrite the app.

## Package

`src/life-os-2/` — independent modules, lazy-loaded via Core Brain skill `lifeOS2`.

```
life-os-2/
  featureFlags.ts · privacyBoundary.ts · repository.ts
  context-fusion/ · prediction/ · habits/ · focus/
  relationships/ · knowledge/ · automation/
  goal-coach/ · companion/ · proactive/
  lifeCoordinator.ts · intentParse.ts
```

## Runtime flow

```
User text → Intent Classifier (parseLifeOs2Intent)
  → Skill Registry lifeOS2 (dynamic import)
  → lifeCoordinator → engines
```

General chat still goes to AI Engine / legacy. Music / translate / Life OS 1 intents keep priority via earlier classifier rules.

## Storage

localStorage envelopes (`aizio_los2_*_v1`) — same pattern as Life OS 1. App data layer is **not** IndexedDB.

## Version

`LIFE_OS2_VERSION = 2.0.0` · App bump: **1.20.0** · Backup schema **v8**

## Status

| Area | Status |
|------|--------|
| Engines listed in §5–13 of product brief | 실제 구현 (local) |
| Emotion / Trust engines | **미구현** (엔진 없음 — Context에 available:false) |
| Live traffic ETA | 외부 API 필요 |
| Real-device UX | 실기기 미확인 |
