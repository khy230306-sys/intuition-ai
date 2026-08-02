# AI Engine changelog

## 1.13.1

- **Core Stability & Integration**: single text/voice pipeline (`handleUserText` → `think` → Core Brain)
- Intent hygiene: reminder parser no longer steals 「가족 일정」/bare「완료」; calendar owns family schedule list
- Music: no dishonest `playing` claim; legacy music only when Core did not claim (or onlyFailed retry)
- brainState: soft social turns do not wipe sticky music/reminder/project intent
- SW update interval de-duplicated; voice source passed into Core Brain
- Docs: `AIZIO_CURRENT_FLOW_MAP.md`, `AIZIO_MOBILE_DEVICE_TEST_CHECKLIST.md`

## 1.13.0

- **Hybrid AI Provider System** (`src/ai-providers/`)
- OpenRouter (`openrouter/free`), Gemini (native), Groq, OpenAI, custom OpenAI-compatible
- Free-first auto routing; paid auto-use **off** by default
- Provider fallback for rate/quota/unavailable/network
- Settings UI cards + first-run AI wizard
- Key masking, obfuscated local storage, backup strips secrets
- Differentiated error messages (not a single “quota exceeded” string)
- Docs: `AIZIO_AI_PROVIDER_GUIDE.md`, `AIZIO_API_KEY_SECURITY.md`, `AIZIO_FREE_AI_LIMITS.md`, `AIZIO_PROVIDER_FALLBACK.md`

## 1.12.0

- **AIZIO Relationship Memory** (`src/relationship/`): conversation family links → `jarvis_relationships_v1`
- **AIZIO Smart Reminder Skill** (`src/smartReminder/`): natural-language appointments + local alarms via `notify.ts`
- Core Brain skills: `relationship`, `smartReminder` (create/update/cancel/snooze/list/ask person)
- Past times stored as missed (no silent roll to next day); closed-app push for personal reminders not claimed
- Docs: `AIZIO_RELATIONSHIP_MEMORY.md`, `AIZIO_SMART_REMINDER.md`, `AIZIO_NOTIFICATION_ARCHITECTURE.md`, `AIZIO_REMINDER_PRIVACY.md`, `AIZIO_REMINDER_TESTS.md`

## 1.11.3

- Fix white screen on launch: version-upgrade path no longer returns before paint; cache clear timed out; stuck `jarvis.refreshing` no longer blocks reload
- Boot splash + 5s safety continue if navigation hangs (iOS SW)

## 1.11.2

- Show 「대화 초기화」 on chat home (empty hero), not only when messages exist

## 1.11.1

- Fix casual chat (칭찬·감사·감정) misclassified as STT failure (`looksLikeSttGarbage`)
- Social phrases → `general_chat` / local polite fallback when API key absent
- Music context follow-ups no longer inherit onto unrelated compliments
- Shorter STT error copy; interpret «스톱» hint only while translate lock is active
- Music mini status line: keep-all wrapping + “YouTube 외부 앱으로 열림” (no vertical glyph stack)

## 1.11.0

- **AIZIO Core Brain** (`src/core-brain/`): Intent Router, Context Resolver, Skill Registry, Execution Planner, Response Composer, safety policy
- All chat/voice text enters Core Brain via `think()`; Skills lazy-loaded; unclear → legacy pipeline (invest/life/geo/AI preserved)
- Connected Skills: music, translation, note, todo, calendar (list), settings, navigation, help; project + personal calendar create = unavailable (honest)
- Docs: `AIZIO_CORE_BRAIN.md`, `AIZIO_SKILL_INTERFACE.md`, `AIZIO_INTENT_CATALOG.md`, `AIZIO_SAFETY_POLICY.md`, `AIZIO_CORE_TESTS.md`, `AIZIO_CORE_CURRENT_STATE.md`
- Checkpoint: `checkpoint/pre-core-brain-1.10.5`

## 1.10.5

- Fix stock-recommend false positives: bare “추천해줘” / music·맛집·여행 asks no longer open stock screening
- Lifestyle recommend router (`lifestyleRecommend.ts`): food, cafe, domestic/world travel, movie, book, gift, workout, date, study, fashion, hotel
- Music intent: “좋은 음악 추천” / playlist-style phrasing maps to Music Skill before invest

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
