# AIZIO Free AI Limits

Free providers offer **limited** daily/minute quotas. Exact numbers change and are **not hardcoded** in AIZIO.

## What AIZIO shows

- Connection status: ok / rate_limit / quota / auth / error
- Internal counters: today’s app requests / success / failure / fallbacks  
  These are **not** official remaining quota from the provider.

## Typical failure modes

- Free daily limit exhausted → try another free provider or wait
- Rate limit (429) → brief wait / fallback
- Invalid key → fix key (no silent paid switch)
- Payment required → user must enable paid use or add billing

## Policy

AIZIO never claims free AI is unlimited.  
Provider policy changes may retire models or free routers; users can override model IDs in settings.
