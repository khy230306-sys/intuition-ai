# AIZIO Global Conversation (v1.9.13)

## Reality check

- **No central multi-user global chat server** is connected.
- Real peer chat = existing **Family** / **Friends** rooms (localStorage + WebRTC/MQTT sync).
- Global view (`view=global`) configures translation + links to those rooms. It does **not** fake “live connected”.

## Message original storage

Family/Friends messages keep author text in `text` (original). Optional:

- `media` — photo/video data URL (size-capped)
- `sourceLanguage` — detected/preferred language

## Translation storage

Separate cache: `localStorage` key `jarvis.globalChat.translationCache.v1`

Fields: messageId, targetLanguage, translatedText, provider, status, timestamps.

## Provider (actual)

1. Offline dictionary / cache (`offlineDict` / prior MyMemory hits)
2. MyMemory public API when online (`translate.ts`) — **no new API keys in the client bundle**

## Behaviour

- Auto-translate peer messages when `autoTranslateMessages` and languages differ
- Author sees original
- Original toggle on translated bubbles
- Skip emoji / OK / numbers / `[사진]`
- Protect URLs, code, mentions during translate
- Offline: show cache or original; no fake success
