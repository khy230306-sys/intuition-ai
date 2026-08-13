import type { MarketSession, SessionPhase } from '@aizio/trade-shared';
import { kstParts } from '../utils/time.js';
import { getTossBroker } from '../brokers/index.js';
import { tossConfigured } from '../config/env.js';

/** KR public holidays / exchange closures (static baseline; Toss calendar preferred when configured). */
const KR_HOLIDAYS = new Set([
  '2026-01-01',
  '2026-03-01',
  '2026-05-05',
  '2026-05-24',
  '2026-06-06',
  '2026-08-15',
  '2026-10-03',
  '2026-10-05',
  '2026-10-09',
  '2026-12-25',
  '2026-12-31', // year-end early/close convention handled separately
]);

/** US federal / exchange holidays (observed dates for 2026). */
const US_HOLIDAYS = new Set([
  '2026-01-01',
  '2026-01-19',
  '2026-02-16',
  '2026-04-03',
  '2026-05-25',
  '2026-06-19',
  '2026-07-03',
  '2026-09-07',
  '2026-11-26',
  '2026-12-25',
]);

/** Early close dates (KR) — ends 12:30 KST style placeholder; reason recorded. */
const KR_EARLY_CLOSE: Record<string, string> = {
  '2026-12-30': '12:30',
};

export interface MarketSessionEngineOptions {
  now?: Date;
  preferTossCalendar?: boolean;
}

function inRange(now: Date, startIso: string, endIso: string): boolean {
  const t = now.getTime();
  return t >= new Date(startIso).getTime() && t < new Date(endIso).getTime();
}

export function getKrSessionLocal(now = new Date()): MarketSession {
  const k = kstParts(now);
  const date = k.dateStr;
  const weekend = k.weekday === 0 || k.weekday === 6;
  const holiday = KR_HOLIDAYS.has(date);
  const isTradingDay = !weekend && !holiday;

  const openHm = '09:00';
  const closeHm = KR_EARLY_CLOSE[date] ?? '15:30';
  const [oh, om] = openHm.split(':').map(Number);
  const [ch, cm] = closeHm.split(':').map(Number);

  // Build KST wall times as UTC-equivalent timestamps via offset
  const opensAt = isTradingDay
    ? new Date(Date.UTC(k.y, k.m - 1, k.d, oh - 9, om, 0))
    : null;
  const closesAt = isTradingDay
    ? new Date(Date.UTC(k.y, k.m - 1, k.d, ch - 9, cm, 0))
    : null;

  let session: SessionPhase = 'CLOSED';
  let isOpen = false;
  let reason: string | undefined;

  if (!isTradingDay) {
    reason = weekend ? 'WEEKEND' : 'HOLIDAY';
  } else {
    const mins = k.hh * 60 + k.mm;
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    // NXT pre 08:00-09:00, regular 09:00-15:30, after 15:30-20:00
    if (mins >= 8 * 60 && mins < openMin) {
      session = 'PRE_MARKET';
      isOpen = true;
      reason = 'NXT_PRE_MARKET';
    } else if (mins >= openMin && mins < closeMin) {
      session = 'REGULAR';
      isOpen = true;
      reason = KR_EARLY_CLOSE[date] ? 'EARLY_CLOSE_DAY' : 'KRX_NXT_REGULAR';
    } else if (mins >= closeMin && mins < 20 * 60) {
      session = 'AFTER_HOURS';
      isOpen = true;
      reason = 'NXT_AFTER_HOURS';
    } else {
      session = 'CLOSED';
      reason = 'OUTSIDE_SESSION';
    }
  }

  return {
    market: 'KR',
    venue: 'KRX',
    tradingDate: date,
    isTradingDay,
    isOpen,
    session,
    opensAt: opensAt?.toISOString() ?? null,
    closesAt: closesAt?.toISOString() ?? null,
    reason,
  };
}

/** US session expressed with DST-aware open/close in America/New_York via Intl. */
export function getUsSessionLocal(now = new Date()): MarketSession {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = parts.weekday;
  const hh = Number(parts.hour === '24' ? '0' : parts.hour);
  const mm = Number(parts.minute);
  const mins = hh * 60 + mm;
  const weekend = weekday === 'Sat' || weekday === 'Sun';
  const holiday = US_HOLIDAYS.has(date);
  const isTradingDay = !weekend && !holiday;

  let session: SessionPhase = 'CLOSED';
  let isOpen = false;
  let reason: string | undefined;
  if (!isTradingDay) {
    reason = weekend ? 'WEEKEND' : 'US_HOLIDAY';
  } else if (mins >= 4 * 60 && mins < 9 * 60 + 30) {
    session = 'PRE_MARKET';
    isOpen = true;
    reason = 'US_PRE_MARKET';
  } else if (mins >= 9 * 60 + 30 && mins < 16 * 60) {
    session = 'REGULAR';
    isOpen = true;
    reason = 'US_REGULAR';
  } else if (mins >= 16 * 60 && mins < 20 * 60) {
    session = 'AFTER_HOURS';
    isOpen = true;
    reason = 'US_AFTER_HOURS';
  } else {
    reason = 'OUTSIDE_SESSION';
  }

  return {
    market: 'US',
    tradingDate: date,
    isTradingDay,
    isOpen,
    session,
    opensAt: null,
    closesAt: null,
    reason,
  };
}

export async function getMarketSession(
  market: 'KR' | 'US' = 'KR',
  opts: MarketSessionEngineOptions = {},
): Promise<MarketSession> {
  const now = opts.now ?? new Date();
  if (opts.preferTossCalendar && tossConfigured()) {
    try {
      const toss = getTossBroker();
      await toss.connect();
      const cal = (await toss.getMarketCalendar(market)) as {
        result?: {
          today: {
            date: string;
            integrated?: {
              preMarket?: { startTime: string; endTime: string } | null;
              regularMarket?: { startTime: string; endTime: string } | null;
              afterMarket?: { startTime: string; endTime: string } | null;
            } | null;
            dayMarket?: { startTime: string; endTime: string } | null;
            preMarket?: { startTime: string; endTime: string } | null;
            regularMarket?: { startTime: string; endTime: string } | null;
            afterMarket?: { startTime: string; endTime: string } | null;
          };
        };
      };
      const today = cal.result?.today;
      if (today) {
        if (market === 'KR') {
          const integ = today.integrated;
          if (!integ) {
            return {
              market: 'KR',
              venue: 'KRX',
              tradingDate: today.date,
              isTradingDay: false,
              isOpen: false,
              session: 'CLOSED',
              opensAt: null,
              closesAt: null,
              reason: 'EXCHANGE_CLOSED',
            };
          }
          const reg = integ.regularMarket;
          const pre = integ.preMarket;
          const after = integ.afterMarket;
          let session: SessionPhase = 'CLOSED';
          let isOpen = false;
          let reason = 'TOSS_CALENDAR';
          if (pre && inRange(now, pre.startTime, pre.endTime)) {
            session = 'PRE_MARKET';
            isOpen = true;
          } else if (reg && inRange(now, reg.startTime, reg.endTime)) {
            session = 'REGULAR';
            isOpen = true;
          } else if (after && inRange(now, after.startTime, after.endTime)) {
            session = 'AFTER_HOURS';
            isOpen = true;
          }
          return {
            market: 'KR',
            venue: 'KRX',
            tradingDate: today.date,
            isTradingDay: Boolean(reg || pre || after),
            isOpen,
            session,
            opensAt: reg?.startTime ?? pre?.startTime ?? null,
            closesAt: reg?.endTime ?? after?.endTime ?? null,
            reason,
          };
        }
        // US via Toss calendar
        const pre = today.preMarket;
        const reg = today.regularMarket;
        const after = today.afterMarket;
        let session: SessionPhase = 'CLOSED';
        let isOpen = false;
        if (pre && inRange(now, pre.startTime, pre.endTime)) {
          session = 'PRE_MARKET';
          isOpen = true;
        } else if (reg && inRange(now, reg.startTime, reg.endTime)) {
          session = 'REGULAR';
          isOpen = true;
        } else if (after && inRange(now, after.startTime, after.endTime)) {
          session = 'AFTER_HOURS';
          isOpen = true;
        }
        return {
          market: 'US',
          tradingDate: today.date,
          isTradingDay: Boolean(reg || pre || after),
          isOpen,
          session,
          opensAt: reg?.startTime ?? null,
          closesAt: reg?.endTime ?? null,
          reason: 'TOSS_CALENDAR',
        };
      }
    } catch {
      // fall through to local calendar
    }
  }
  return market === 'US' ? getUsSessionLocal(now) : getKrSessionLocal(now);
}

export function isRegularSessionOpen(session: MarketSession): boolean {
  return session.isTradingDay && session.session === 'REGULAR' && session.isOpen;
}
