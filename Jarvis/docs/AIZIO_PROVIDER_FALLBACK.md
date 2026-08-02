# AIZIO Provider Fallback

## Auto order (default)

1. OpenRouter (free)
2. Gemini (free)
3. Groq (free)
4. OpenAI / custom — **only if** `allowPaidFallback` is on, or mode is `fixed`

## Fallback allowed

- Network / temporary server errors
- Rate limits
- Free quota exhaustion
- Model unavailable
- Auth failure on one free provider (try next free)

## Fallback blocked

- User cancelled
- No providers configured
- Offline (show offline guidance once)
- Paid provider when auto paid fallback is off
- Safety / invalid user request (handled before hybrid chat)

## Local-first

Core Brain skills (notes, todos, calendar, reminders, relationships, music, settings) run **without** calling any AI provider.
