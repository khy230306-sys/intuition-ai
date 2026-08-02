# AI Engine changelog

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
