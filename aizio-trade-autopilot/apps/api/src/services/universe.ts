import { env, tossConfigured } from '../config/env.js';
import { prisma } from '../db/client.js';
import { getReplayProvider, getTossMarketDataProvider } from '../marketdata/index.js';
import type { ListedSymbol } from '../marketdata/types.js';

export interface UniverseFilters {
  includeEtf?: boolean;
  includeEtn?: boolean;
  commonShareOnly?: boolean;
}

let memoryUniverse: ListedSymbol[] = [];
let lastRefreshAt = 0;
let watchlist: string[] = [];

export function getWatchlist(): string[] {
  return [...watchlist];
}

export function setWatchlist(symbols: string[]) {
  watchlist = [...new Set(symbols)].slice(0, 80);
}

export async function refreshUniverse(force = false): Promise<ListedSymbol[]> {
  if (!force && memoryUniverse.length && Date.now() - lastRefreshAt < env.UNIVERSE_REFRESH_MS) {
    return memoryUniverse;
  }

  const filters: UniverseFilters = {
    includeEtf: env.UNIVERSE_INCLUDE_ETF,
    includeEtn: env.UNIVERSE_INCLUDE_ETN,
    commonShareOnly: env.UNIVERSE_COMMON_SHARE_ONLY,
  };

  let raw: ListedSymbol[] = [];
  if (tossConfigured()) {
    try {
      raw = await getTossMarketDataProvider().listSymbols('KR');
    } catch {
      raw = await getReplayProvider().listSymbols('KR');
    }
  } else {
    raw = await getReplayProvider().listSymbols('KR');
  }

  const filtered = raw.filter((s) => {
    if (filters.commonShareOnly && !s.isCommonShare) return false;
    if (!filters.includeEtf && s.securityType === 'ETF') return false;
    if (!filters.includeEtn && s.securityType === 'ETN') return false;
    if (s.securityType === 'STOCK_WARRANTS') return false;
    return s.status === 'ACTIVE' || s.status === 'HALTED';
  });

  memoryUniverse = filtered;
  lastRefreshAt = Date.now();

  // Persist summary counts / sample to DB
  for (const s of filtered.slice(0, 500)) {
    await prisma.symbolRow.upsert({
      where: { symbol: s.symbol },
      create: {
        symbol: s.symbol,
        name: s.name,
        market: s.market,
        securityType: s.securityType,
        listed: s.tradable,
        halted: s.halted,
        managed: s.managed,
        isNewListing: s.isNewListing,
        metaJson: JSON.stringify({
          exchange: s.exchange,
          status: s.status,
          isCommonShare: s.isCommonShare,
          nxtSupported: s.nxtSupported,
        }),
      },
      update: {
        name: s.name,
        securityType: s.securityType,
        listed: s.tradable,
        halted: s.halted,
        managed: s.managed,
        metaJson: JSON.stringify({
          exchange: s.exchange,
          status: s.status,
          isCommonShare: s.isCommonShare,
          nxtSupported: s.nxtSupported,
        }),
      },
    });
  }

  await prisma.configKv.upsert({
    where: { key: 'universe_meta' },
    create: {
      key: 'universe_meta',
      valueJson: JSON.stringify({
        count: filtered.length,
        refreshedAt: new Date().toISOString(),
        source: tossConfigured() ? 'TOSS' : 'REPLAY_SEED',
      }),
    },
    update: {
      valueJson: JSON.stringify({
        count: filtered.length,
        refreshedAt: new Date().toISOString(),
        source: tossConfigured() ? 'TOSS' : 'REPLAY_SEED',
      }),
    },
  });

  return filtered;
}

export async function getUniverse(): Promise<ListedSymbol[]> {
  if (!memoryUniverse.length) return refreshUniverse(true);
  return memoryUniverse;
}

export async function universeCount(): Promise<number> {
  const u = await getUniverse();
  return u.length;
}
