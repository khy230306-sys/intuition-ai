# AIZIO Stock Engine v2

Deterministic, local-first equity helper for the PWA. **Not investment advice.**

## Capabilities

| Feature | Command examples |
|--------|-------------------|
| Multi-factor screening | `주식 종목 추천`, `반도체 종목 추천`, `미국 보수 종목 추천` |
| Single-name analysis | `삼성전자 종목분석`, `NVDA 종목분석` |
| Portfolio | `포트폴리오` |
| Engine info | `주식 엔진` |
| Quotes / tools | existing: 시세, 관심종목, 보유, 포지션, 적립, 체크리스트 |

### Factors

1. 52-week range position  
2. Day change % (sanitized)  
3. ~5-day momentum (from Yahoo chart bars / snapshot)  
4. Relative volume vs recent average  
5. Sector fit vs risk profile + already-owned penalty  

### Data

- Live: Yahoo Finance chart API (browser; CORS may fall back to proxy/snapshot)  
- Offline: `public/quote-snapshot.json` built by `npm run quotes`  
- Universe: `src/stockEngine/universe.ts` (~45 liquid KR/US names + ETFs)

## Code map

- `src/stockEngine/` — engine module  
- `src/recommend.ts` — compatibility re-export  
- `src/brain.ts` → `handleInvest`  
- `scripts/fetch-quotes.mjs` — snapshot builder  

## Honesty rules

- Never invent prices  
- Always show disclaimer on screening / analysis / portfolio  
- AI chat must not override engine numbers for picks  
