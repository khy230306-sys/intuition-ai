# AIZIO TRADE AUTOPILOT V1

Persistent server-side automated trading system (Paper-first). Frontend is a control panel; the Autopilot core runs in the Backend Worker and survives app/browser close.

## Stack

- Frontend: React + TypeScript + Vite + PWA
- Backend: Node.js + TypeScript + Fastify + WebSocket
- DB: SQLite via Prisma (PostgreSQL-ready schema)
- Validation: Zod
- Tests: Vitest

## Official Toss API

Adapter implemented against:

- https://developers.tossinvest.com/llms.txt
- https://openapi.tossinvest.com/openapi-docs/latest/openapi.json (v1.2.14)

Confirmed: OAuth2 Client Credentials, `X-Tossinvest-Account`, REST only (no WebSocket streaming).

## Quick start

```bash
cd aizio-trade-autopilot
cp .env.example .env
# Edit .env: TOSS_CLIENT_ID + TOSS_CLIENT_SECRET (ACCOUNT_SEQ optional / auto)
# ALLOW_LIVE=false
npm install
npm run db:generate
npm run db:push
npm run dev:api   # http://0.0.0.0:8787
npm run dev:web   # http://0.0.0.0:5177
```

## V1.2 SHADOW on your PC (recommended)

Toss Open API locks to **allowed IPs**. Cursor Cloud egress IPs rotate → `IP_NOT_ALLOWED`.
Run on the machine whose public IP is already allowlisted (e.g. `14.44.105.121`):

```bash
git fetch origin && git checkout cursor/aizio-trade-shadow-v12-1c4f
cd aizio-trade-autopilot
cp .env.example .env   # then fill TOSS_CLIENT_ID / TOSS_CLIENT_SECRET
npm install && npm run db:generate && npm run db:push
npm run toss:probe     # must show AUTH PASS
npm run toss:report    # prints AIZIO TRADE V1.2 SHADOW 1..22 report
npm run dev            # API + Web
# UI: mode=SHADOW → start  |  or GET /api/diagnostics/v12-report
```

Keep `ALLOW_LIVE=false`. Real `placeOrder` stays `LIVE_ORDERS_LOCKED`.

## Tests

```bash
npm test
```

## LIVE prerequisites

Set in `.env` (never commit secrets):

- `TOSS_CLIENT_ID`
- `TOSS_CLIENT_SECRET`
- `TOSS_ACCOUNT_SEQ` (optional — auto from accounts API)
- Allowed IP in Toss WTS Open API settings (**this PC's IP**)
- Optional: `AI_PROVIDER_*`
- `ALLOW_LIVE=true` only after `/api/diagnostics/live` all PASS
