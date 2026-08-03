# AIZIO Preview Deploy (device verification)

**Channel:** preview (ShipStatic snapshot)  
**Does not change:** https://jarvis-app.shipstatic.com

## Latest review URL (this agent run)

| Field | Value |
|-------|--------|
| REVIEW_URL | https://keen-drifter-97nqfnk.shipstatic.com |
| Version | 1.15.2 |
| Commit | 2160fb9 |
| Default PUSH_SERVER_URL (baked) | https://medal-kansas-attachment-gilbert.trycloudflare.com |
| Production | https://jarvis-app.shipstatic.com → still `adaptive-echo-t118nxm` (unchanged) |

Previous preview (still valid snapshot, older build): https://harmonic-rift-5oo4f3w.shipstatic.com

## Status

**실기기 검증 대기** — closed-app receive must be confirmed on iPhone/Android PWA by the user.

## Notes on push tunnel

Cloudflare Quick Tunnel URL is ephemeral (dies when the agent/process stops).
For durable HTTPS, deploy `Jarvis/push-server` to Render — see `AIZIO_PUSH_SERVER_USER_DEPLOY.md` — then:

```bash
cd Jarvis
PUSH_SERVER_URL=https://<your-render>.onrender.com npm run deploy:preview
```

Redeploy preview anytime:

```bash
cd Jarvis && PUSH_SERVER_URL=… npm run deploy:preview
```

Production promote (user approval only):

```bash
cd Jarvis && npm run deploy:web
```

## Notes

- Preview origin ≠ production origin → localStorage is separate.
- Settings → 푸시 서버 URL can override the baked default.
- Closed-app personal reminders: follow iOS/Android real-device docs.
