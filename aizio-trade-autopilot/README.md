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
npm install
npm run db:generate
npm run db:push
npm run dev:api   # http://0.0.0.0:8787
npm run dev:web   # http://0.0.0.0:5177
```

## Tests

```bash
npm test
```

## LIVE prerequisites

Set in `.env` (never commit secrets):

- `TOSS_CLIENT_ID`
- `TOSS_CLIENT_SECRET`
- `TOSS_ACCOUNT_SEQ`
- Allowed IP in Toss WTS Open API settings
- Optional: `AI_PROVIDER_*`
- `ALLOW_LIVE=true` only after `/api/diagnostics/live` all PASS
