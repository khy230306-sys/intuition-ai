# AIZIO Continuous Translation (번역 잠금)

## Modes

| Mode | Example | Lock |
|------|---------|------|
| Continuous | `지금부터 베트남어로 번역해줘`, `베트남말 번역하기` | ON until stop |
| One-shot | `안녕하세요를 베트남어로 번역해줘` | stays OFF |
| Switch | (while ON) `영어로 바꿔줘` | stays ON, target changes |
| Stop | `번역 그만`, `통역 종료`, `번역 잠금 꺼줘` | OFF |

## Intent priority (`brain.think`)

1. Core Brain (may claim translate skill)
2. **Translate lock / enable** (`wantsTranslate` or active lock)
3. Clear app commands escape lock: 길안내, 알림, 일정, 음악, 전화, 브리핑, 날씨, 로또…
4. Local fun, encyclopedia, navigation, everyday, life, AI…

## Storage

- Key: `jarvis_interpret_mode_v3` (migrates `v2`)
- Fields: `active`, `langA`, `langB`, `listening`, `live`, `lockUntilStop`, `showOriginal`, `updatedAt`

## UI

HOME v2 badge:

- Off: `번역 잠금 꺼짐`
- On: `번역 잠금 켜짐 · 자동 감지 → 베트남어`

## Engine

`translateText` → MyMemory online + offline dictionary. Does **not** require cloud LLM API keys.

## Privacy

Source sentences stay on-device except outbound MyMemory requests when online.

## Device check

1. Preview chat
2. `지금부터 베트남어로 번역해줘` → badge ON
3. `안녕하세요` → Xin chào
4. `영어로 바꿔줘` → then `안녕하세요` → English
5. `번역 그만` → badge OFF
