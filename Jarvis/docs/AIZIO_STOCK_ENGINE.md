# AIZIO Stock Engine v2.1 (AI Quant Screen)

Deterministic, local-first equity helper for the PWA.  
**Confident ranks from live/snapshot factors. Final invest decision is the user’s.**

## Capabilities

| Feature | Command examples |
|--------|-------------------|
| AI-quant screening | `주식 종목 추천`, `반도체 종목 추천`, `미국 보수 종목 추천` |
| Single-name analysis | `삼성전자 종목분석`, `NVDA 종목분석` |
| Portfolio | `포트폴리오` |
| Engine info | `주식 엔진` |
| Quotes / tools | 시세, 관심종목, 보유, 포지션, 적립, 체크리스트 |

## Model (retail AI / algo screener methods)

Not a broker auto-trader — adopts **screening methodologies** used by many AI/algo tools:

1. **Momentum** — day + ~5d path + range trend tilt (CTA-style)  
2. **Mean reversion** — RSI proxy from 5d, oversold + volume (MR bots)  
3. **Relative strength** — cross-sectional 5d percentile in the screened set  
4. **52-week range** — chase / value band  
5. **Volume confirmation** — vs recent average  
6. **Sector × risk profile** + already-owned penalty  
7. **Leverage guard** — QLD / TQQQ capped for conservative / balanced  

Actions: `엔진추천` (≥68) · `관심` · `관망` · `회피`

### Recommendation card (output)

Each pick shows:

- 투자 매력도 % (engine score)  
- 목표가 / 손절가 / 매도가(1차 익절) — derived from spot, score, risk, 52w band  


## Data

- Live: Yahoo Finance chart API (browser; CORS may fall back to proxy/snapshot)  
- Offline: `public/quote-snapshot.json` via `npm run quotes`  
- Universe: `src/stockEngine/universe.ts` (~95 liquid KR/US names + ETFs)

## Code map

- `src/stockEngine/` — engine module  
- `src/recommend.ts` — compatibility re-export  
- `src/brain.ts` → `handleInvest`  
- `scripts/fetch-quotes.mjs` — snapshot builder  

## Honesty rules

- Never invent prices  
- One clear user-decides line on screening / analysis / portfolio  
- AI chat must not invent prices or override engine numbers for picks  
