# AIZIO API Key Security

## Important limitation

A mobile PWA cannot provide server-grade secret storage. Keys in `localStorage` (even obfuscated) can be recovered on the same device by anyone with access to the browser profile.

## AIZIO protections

- Per-user / per-device keys only — never a shared operator key in the bundle
- Keys obfuscated at rest (`jarvis_hybrid_ai_v1`)
- Settings UI shows **masked** keys, not full secrets
- Blank password fields keep the existing key
- Logs use `redactSecrets`
- Backup export strips API keys (metadata `hasKey` only)
- Key delete per provider
- Trim whitespace on save

## Do not

- Commit keys to Git
- Put keys in docs or chat publicly
- Distribute one company key inside the app for all users
- Assume client obfuscation equals encryption at rest on a server

## If a key is exposed

Revoke it at the provider console and create a new one immediately.
