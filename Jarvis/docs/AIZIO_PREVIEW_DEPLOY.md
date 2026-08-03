# AIZIO Preview Deploy (device verification)

**Channel:** preview (ShipStatic snapshot)  
**Does not change:** https://jarvis-app.shipstatic.com

## Latest review URL (this agent run)

| Field | Value |
|-------|--------|
| REVIEW_URL | https://harmonic-rift-5oo4f3w.shipstatic.com |
| Version | 1.15.1 |
| Commit | 531bc67 |
| Production | https://jarvis-app.shipstatic.com → still `adaptive-echo-t118nxm` (unchanged) |

Redeploy preview anytime:

```bash
cd Jarvis && npm run deploy:preview
```

Production promote (user approval only):

```bash
cd Jarvis && npm run deploy:web
```

## Notes

- Preview origin ≠ production origin → localStorage is separate. That is expected for safe verification.
- Closed-app personal reminders still need a push server URL (`docs/AIZIO_PUSH_SERVER_SETUP.md`).
