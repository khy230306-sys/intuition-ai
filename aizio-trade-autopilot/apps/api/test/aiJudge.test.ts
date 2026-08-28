import { describe, expect, it } from 'vitest';
import { deterministicJudge } from '../src/ai/judge.js';
import { AITradeDecisionSchema } from '../src/ai/schemas.js';
import { ReplayMarketDataProvider } from '../src/marketdata/replayProvider.js';

describe('AI Judge', () => {
  it('returns schema-valid deterministic decisions', async () => {
    const market = new ReplayMarketDataProvider();
    const quote = await market.getQuote('005930');
    const result = deterministicJudge({
      candidate: {
        symbol: '005930',
        name: '삼성전자',
        quote,
        marketCap: 1e14,
        spreadPct: 0.1,
      },
      quant: {
        symbol: '005930',
        total: 62,
        parts: {},
      },
      signals: [
        {
          symbol: '005930',
          strategyId: 'momentum',
          score: 40,
          confidence: 0.7,
          detectedAt: new Date().toISOString(),
          evidence: [{ metric: 'm', value: 1, reason: 'test' }],
        },
      ],
      regime: 'BULL',
    });
    expect(result.valid).toBe(true);
    expect(AITradeDecisionSchema.safeParse(result.decision).success).toBe(true);
  });
});
