import { prisma } from '../db/client.js';
import { ALL_DISCOVERY_ENGINES } from '../engines/discovery.js';
import type { ScanFunnel } from '../engines/scanner.js';

export interface StrategyShadowStats {
  strategyId: string;
  signalsDetected: number;
  watch: number;
  rejected: number;
  wouldBuy: number;
  wouldSell: number;
  paperPnl: number;
  quantEligible: number;
  aiBlocked: number;
}

export interface ShadowResearchSnapshot {
  funnel: ScanFunnel | null;
  regime: string | null;
  regimeWeightsApplied: boolean;
  strategies: StrategyShadowStats[];
  quantEligibleTotal: number;
  aiBlockedTotal: number;
  shadowTrades: number;
  shadowPnl: number;
  dataFreshness: { ok: boolean; lastAgeMs: number | null; source: string | null };
  marketWaiting: boolean;
  updatedAt: string;
}

const KEY = 'shadow_research';

function emptyStrategies(): StrategyShadowStats[] {
  return ALL_DISCOVERY_ENGINES.map((e) => ({
    strategyId: e.strategyId,
    signalsDetected: 0,
    watch: 0,
    rejected: 0,
    wouldBuy: 0,
    wouldSell: 0,
    paperPnl: 0,
    quantEligible: 0,
    aiBlocked: 0,
  }));
}

async function load(): Promise<ShadowResearchSnapshot> {
  const row = await prisma.configKv.findUnique({ where: { key: KEY } });
  if (!row) {
    return {
      funnel: null,
      regime: null,
      regimeWeightsApplied: false,
      strategies: emptyStrategies(),
      quantEligibleTotal: 0,
      aiBlockedTotal: 0,
      shadowTrades: 0,
      shadowPnl: 0,
      dataFreshness: { ok: true, lastAgeMs: null, source: null },
      marketWaiting: false,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    return JSON.parse(row.valueJson) as ShadowResearchSnapshot;
  } catch {
    return {
      funnel: null,
      regime: null,
      regimeWeightsApplied: false,
      strategies: emptyStrategies(),
      quantEligibleTotal: 0,
      aiBlockedTotal: 0,
      shadowTrades: 0,
      shadowPnl: 0,
      dataFreshness: { ok: true, lastAgeMs: null, source: null },
      marketWaiting: false,
      updatedAt: new Date().toISOString(),
    };
  }
}

async function save(snap: ShadowResearchSnapshot) {
  snap.updatedAt = new Date().toISOString();
  await prisma.configKv.upsert({
    where: { key: KEY },
    create: { key: KEY, valueJson: JSON.stringify(snap) },
    update: { valueJson: JSON.stringify(snap) },
  });
}

function ensureStrategy(snap: ShadowResearchSnapshot, strategyId: string): StrategyShadowStats {
  let s = snap.strategies.find((x) => x.strategyId === strategyId);
  if (!s) {
    s = {
      strategyId,
      signalsDetected: 0,
      watch: 0,
      rejected: 0,
      wouldBuy: 0,
      wouldSell: 0,
      paperPnl: 0,
      quantEligible: 0,
      aiBlocked: 0,
    };
    snap.strategies.push(s);
  }
  return s;
}

export async function getShadowResearch(): Promise<ShadowResearchSnapshot> {
  return load();
}

export async function recordFunnel(funnel: ScanFunnel, discoveryCount: number, quantCount: number) {
  const snap = await load();
  const stages = [
    ...funnel.stages,
    { name: 'discovery', count: discoveryCount, ms: 0 },
    { name: 'quant_finalists', count: quantCount, ms: 0 },
  ];
  snap.funnel = {
    stages,
    chain: [...funnel.chain, discoveryCount, quantCount],
  };
  await save(snap);
}

export async function recordRegime(regime: string, weightsApplied: boolean) {
  const snap = await load();
  snap.regime = regime;
  snap.regimeWeightsApplied = weightsApplied;
  await save(snap);
}

export async function recordStrategySignal(strategyId: string) {
  const snap = await load();
  ensureStrategy(snap, strategyId).signalsDetected += 1;
  await save(snap);
}

export async function recordStrategyOutcome(
  strategyId: string,
  outcome: 'WATCH' | 'REJECT' | 'WOULD_BUY' | 'WOULD_SELL',
  pnlDelta = 0,
) {
  const snap = await load();
  const s = ensureStrategy(snap, strategyId);
  if (outcome === 'WATCH') s.watch += 1;
  if (outcome === 'REJECT') s.rejected += 1;
  if (outcome === 'WOULD_BUY') {
    s.wouldBuy += 1;
    snap.shadowTrades += 1;
  }
  if (outcome === 'WOULD_SELL') {
    s.wouldSell += 1;
    s.paperPnl += pnlDelta;
    snap.shadowPnl += pnlDelta;
  }
  await save(snap);
}

export async function recordQuantEligible(strategyId: string | undefined, aiBlocked: boolean) {
  const snap = await load();
  snap.quantEligibleTotal += 1;
  if (strategyId) ensureStrategy(snap, strategyId).quantEligible += 1;
  if (aiBlocked) {
    snap.aiBlockedTotal += 1;
    if (strategyId) ensureStrategy(snap, strategyId).aiBlocked += 1;
  }
  await save(snap);
}

export async function recordFreshness(ageMs: number, source: string, ok: boolean) {
  const snap = await load();
  snap.dataFreshness = { ok, lastAgeMs: ageMs, source };
  await save(snap);
}

export async function setMarketWaiting(waiting: boolean) {
  const snap = await load();
  snap.marketWaiting = waiting;
  await save(snap);
}
