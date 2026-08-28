import { env, tossConfigured } from '../config/env.js';
import { prisma } from '../db/client.js';
import { getReplayProvider, getTossMarketDataProvider } from '../marketdata/index.js';
import type { ListedSymbol } from '../marketdata/types.js';

export interface UniverseFilters {
  includeEtf?: boolean;
  includeEtn?: boolean;
  commonShareOnly?: boolean;
}

export interface UniverseStats {
  total: number;
  kospi: number;
  kosdaq: number;
  tradable: number;
  excluded: number;
  etf: number;
  etn: number;
  spac: number;
  preferred: number;
  suspended: number;
  source: 'TOSS' | 'REPLAY_SEED';
  refreshedAt: string | null;
  liveLabel: 'LIVE' | 'REPLAY';
}

let memoryUniverse: ListedSymbol[] = [];
let memoryRaw: ListedSymbol[] = [];
let lastRefreshAt = 0;
let lastSource: 'TOSS' | 'REPLAY_SEED' = 'REPLAY_SEED';
let watchlist: string[] = [];

export function getWatchlist(): string[] {
  return [...watchlist];
}

export function setWatchlist(symbols: string[]) {
  watchlist = [...new Set(symbols)].slice(0, 80);
}

function classifyStats(raw: ListedSymbol[], filtered: ListedSymbol[], source: 'TOSS' | 'REPLAY_SEED'): UniverseStats {
  const filteredSet = new Set(filtered.map((s) => s.symbol));
  let etf = 0;
  let etn = 0;
  let spac = 0;
  let preferred = 0;
  let suspended = 0;
  let kospi = 0;
  let kosdaq = 0;
  let tradable = 0;
  for (const s of raw) {
    const ex = (s.exchange || '').toUpperCase();
    if (ex.includes('KOSPI')) kospi += 1;
    else if (ex.includes('KOSDAQ')) kosdaq += 1;
    if (s.tradable && (s.status === 'ACTIVE' || s.status === 'HALTED')) tradable += 1;
    if (s.securityType === 'ETF') etf += 1;
    if (s.securityType === 'ETN') etn += 1;
    if (/SPAC/i.test(s.name) || s.securityType === 'SPAC') spac += 1;
    if (!s.isCommonShare || /우$|우B$|우선/i.test(s.name)) preferred += 1;
    if (s.halted || s.status === 'SUSPENDED' || s.status === 'HALTED') suspended += 1;
  }
  return {
    total: raw.length,
    kospi,
    kosdaq,
    tradable,
    excluded: Math.max(0, raw.length - filteredSet.size),
    etf,
    etn,
    spac,
    preferred,
    suspended,
    source,
    refreshedAt: lastRefreshAt ? new Date(lastRefreshAt).toISOString() : null,
    liveLabel: source === 'TOSS' ? 'LIVE' : 'REPLAY',
  };
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
  let source: 'TOSS' | 'REPLAY_SEED' = 'REPLAY_SEED';

  if (tossConfigured()) {
    try {
      raw = await getTossMarketDataProvider().listSymbols('KR');
      source = 'TOSS';
    } catch (e) {
      // Never silently substitute REPLAY seed when Toss is configured.
      if (memoryRaw.length && lastSource === 'TOSS') {
        raw = memoryRaw;
        source = 'TOSS';
      } else {
        throw e instanceof Error
          ? e
          : new Error('TOSS_UNIVERSE_UNAVAILABLE: refusing REPLAY fallback');
      }
    }
  } else {
    raw = await getReplayProvider().listSymbols('KR');
    source = 'REPLAY_SEED';
  }

  const filtered = raw.filter((s) => {
    if (filters.commonShareOnly && !s.isCommonShare) return false;
    if (!filters.includeEtf && s.securityType === 'ETF') return false;
    if (!filters.includeEtn && s.securityType === 'ETN') return false;
    if (s.securityType === 'STOCK_WARRANTS') return false;
    return s.status === 'ACTIVE' || s.status === 'HALTED';
  });

  memoryRaw = raw;
  memoryUniverse = filtered;
  lastRefreshAt = Date.now();
  lastSource = source;

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

  const stats = classifyStats(raw, filtered, source);
  await prisma.configKv.upsert({
    where: { key: 'universe_meta' },
    create: {
      key: 'universe_meta',
      valueJson: JSON.stringify({ ...stats, count: filtered.length }),
    },
    update: {
      valueJson: JSON.stringify({ ...stats, count: filtered.length }),
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

export async function getUniverseStats(): Promise<UniverseStats> {
  if (!memoryRaw.length && !memoryUniverse.length) {
    try {
      await refreshUniverse(true);
    } catch {
      /* keep empty */
    }
  }
  if (memoryRaw.length) return classifyStats(memoryRaw, memoryUniverse, lastSource);
  const row = await prisma.configKv.findUnique({ where: { key: 'universe_meta' } });
  if (row) {
    try {
      const parsed = JSON.parse(row.valueJson) as Partial<UniverseStats> & { count?: number };
      return {
        total: parsed.total ?? parsed.count ?? 0,
        kospi: parsed.kospi ?? 0,
        kosdaq: parsed.kosdaq ?? 0,
        tradable: parsed.tradable ?? 0,
        excluded: parsed.excluded ?? 0,
        etf: parsed.etf ?? 0,
        etn: parsed.etn ?? 0,
        spac: parsed.spac ?? 0,
        preferred: parsed.preferred ?? 0,
        suspended: parsed.suspended ?? 0,
        source: parsed.source === 'TOSS' ? 'TOSS' : 'REPLAY_SEED',
        refreshedAt: parsed.refreshedAt ?? null,
        liveLabel: parsed.source === 'TOSS' ? 'LIVE' : 'REPLAY',
      };
    } catch {
      /* fallthrough */
    }
  }
  return {
    total: memoryUniverse.length,
    kospi: 0,
    kosdaq: 0,
    tradable: memoryUniverse.length,
    excluded: 0,
    etf: 0,
    etn: 0,
    spac: 0,
    preferred: 0,
    suspended: 0,
    source: lastSource,
    refreshedAt: null,
    liveLabel: lastSource === 'TOSS' ? 'LIVE' : 'REPLAY',
  };
}
