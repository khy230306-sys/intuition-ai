# AIZIO Preview Deploy (device verification)

**Channel:** preview (ShipStatic snapshot)  
**Does not change:** https://jarvis-app.shipstatic.com

## Latest review URL (this agent run)

| Field | Value |
|-------|--------|
| REVIEW_URL | https://encoded-mesh-r5a5fkf.shipstatic.com |
| Version | 1.15.5 |
| Commit | cc44c4b |
| HOME v2 (default) | https://encoded-mesh-r5a5fkf.shipstatic.com |
| HOME v2 direct | https://encoded-mesh-r5a5fkf.shipstatic.com/?home=v2 |
| Legacy home | https://encoded-mesh-r5a5fkf.shipstatic.com/?home=legacy |
| 길안내 sheet | https://encoded-mesh-r5a5fkf.shipstatic.com/?nav=1 |
| 손님관리 | https://encoded-mesh-r5a5fkf.shipstatic.com/?customers=1 |
| Default PUSH_SERVER_URL (baked) | _(empty — set in Settings; tunnel optional)_ |
| Production | https://jarvis-app.shipstatic.com → still `adaptive-echo-t118nxm` (unchanged) |

Previous previews: https://laced-prism-88ovu7m.shipstatic.com · https://airy-dome-rpkmd84.shipstatic.com · https://keen-drifter-97nqfnk.shipstatic.com

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
