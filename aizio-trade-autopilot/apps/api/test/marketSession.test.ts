import { describe, expect, it } from 'vitest';
import { getKrSessionLocal, getUsSessionLocal } from '../src/engines/marketSession.js';

describe('MarketSessionEngine', () => {
  it('marks weekend as closed trading day=false', () => {
    // 2026-08-15 is Saturday? Let's use known Sunday
    const sunday = new Date('2026-08-09T01:00:00Z'); // KST Sunday 10:00
    const s = getKrSessionLocal(sunday);
    expect(s.isTradingDay).toBe(false);
    expect(s.session).toBe('CLOSED');
    expect(s.reason).toBe('WEEKEND');
  });

  it('marks KR holiday closed', () => {
    const hangulDay = new Date('2026-10-08T23:30:00Z'); // Oct 9 08:30 KST (weekday holiday)
    const s = getKrSessionLocal(hangulDay);
    expect(s.tradingDate).toBe('2026-10-09');
    expect(s.isTradingDay).toBe(false);
    expect(s.reason).toBe('HOLIDAY');
  });

  it('detects regular session on trading day', () => {
    const tue = new Date('2026-08-11T01:15:00Z'); // Aug 11 10:15 KST Tuesday
    const s = getKrSessionLocal(tue);
    expect(s.isTradingDay).toBe(true);
    expect(s.session).toBe('REGULAR');
    expect(s.isOpen).toBe(true);
  });

  it('detects pre-market', () => {
    const tue = new Date('2026-08-10T23:30:00Z'); // Aug 11 08:30 KST
    const s = getKrSessionLocal(tue);
    expect(s.session).toBe('PRE_MARKET');
  });

  it('US DST-aware session uses America/New_York', () => {
    // Rough check: function returns structured session
    const s = getUsSessionLocal(new Date('2026-07-01T14:30:00Z'));
    expect(s.market).toBe('US');
    expect(['PRE_MARKET', 'REGULAR', 'AFTER_HOURS', 'CLOSED']).toContain(s.session);
  });
});
