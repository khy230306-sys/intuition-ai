# AI Engine changelog

## 1.10.4

- Add Chinese (中文 / `zh`) to app display language and room translation language pickers

## 1.10.3

- Fix space-chat voice repeats: 전송+자동전송 겹침 차단, 입력창에 STT 초안 미기입, 2.5초 동일문구 스토어 디듀프
- Faster peer chat: broadcast without waiting for reconnect, drop 600ms join delay, MQTT qos1, slim 12s announce
- Sync UI: health ticks only patch status; data path soft-appends immediately

## 1.10.2

- Fix voice dictation double-send (silence auto-final racing MIC STOP) via `consumeTranscript` + once-per-session delivery
- Dedupe identical family/friends chat posts within 1.6s

## 1.10.1

- Faster home/room navigation: point-based ghost-click guard (no more dead taps for 480ms on nearby buttons)
- Document-level nav/tab delegation + instant tap feedback
- Soft-append family/friends chat sends (no full remount)
- Inbox short cache + unread scan from newest; fix soft sync header online count
- Snappier shell/home animations; preserve “대화방” open state

## 1.10.0

- AIZIO Music Skill (`src/music/`) as an independent module
- Music intent classification before general AI (ambiguous → AI unchanged)
- YouTube / YouTube Music / Spotify / Apple Music safe search URLs (no unofficial streams)
- Gesture-required play chip + mini player; no fake autoplay success
- Music prefs/session keys: `jarvis.music.*` (existing data untouched)
- Docs: `AIZIO_MUSIC_SKILL.md`, `MUSIC_PROVIDER_SETUP.md`, `MOBILE_AUTOPLAY_LIMITATIONS.md`

## 1.9.12

- AI Engine abstraction under `src/ai/`
- Modes: chat / coding / planning / analysis (auto-select)
- Router keeps current OpenAI-compatible provider; adapter hooks for future providers
- Structured system prompt (mobile PWA identity; no false OpenClaw/Ollama claims)
- Context manager: recent turns, dedupe, char budget
- Response validation (empty/html/repeat/secret redact)
- Timeout, network retry, 429 backoff, no 401 auto-retry, in-flight dedupe
- User-facing Korean error messages
- Existing UI / local commands / storage / voice path preserved
