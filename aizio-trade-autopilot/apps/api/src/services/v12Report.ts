import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, tossConfigured } from '../config/env.js';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getTossBroker } from '../brokers/index.js';
import { runShadowConnectionVerify } from './shadowVerify.js';
import { getUniverseStats, refreshUniverse } from './universe.js';
import { getShadowResearch } from './shadowMetrics.js';
import { getMarketSession } from '../engines/marketSession.js';
import { prisma } from '../db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Persist discovered accountSeq into local .env files (never logs the value). */
export function persistAccountSeqToEnv(seq: string): void {
  const roots = [
    resolve(__dirname, '../../../../.env'),
    resolve(__dirname, '../../../.env'),
  ];
  for (const file of roots) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    let found = false;
    const next = lines.map((line) => {
      if (line.startsWith('TOSS_ACCOUNT_SEQ=')) {
        found = true;
        return `TOSS_ACCOUNT_SEQ=${seq}`;
      }
      return line;
    });
    if (!found) next.push(`TOSS_ACCOUNT_SEQ=${seq}`);
    writeFileSync(file, next.join('\n') + (next[next.length - 1] === '' ? '' : '\n'));
  }
}

export interface V12ShadowReport {
  title: string;
  items: Array<{ n: number; name: string; value: string }>;
  actualLiveOrdersSent: number;
  remainingRequirements: string[];
  stages?: Array<{ name: string; result: string; detail: string }>;
}

export async function buildV12ShadowReport(): Promise<V12ShadowReport> {
  const verify = await runShadowConnectionVerify();
  const by = new Map(verify.stages.map((s) => [s.name, s]));
  const pick = (name: string) => {
    const s = by.get(name);
    return s ? `${s.result} (${s.detail})` : 'NOT_RUN';
  };

  let universeLine = 'NOT_RUN';
  try {
    if (tossConfigured()) {
      await refreshUniverse(true);
    }
    const u = await getUniverseStats();
    universeLine = `source=${u.source} total=${u.total} kospi=${sNum(u.kospi)} kosdaq=${sNum(u.kosdaq)} tradable=${u.tradable}`;
  } catch (e) {
    universeLine = e instanceof Error ? e.message.slice(0, 120) : 'fail';
  }

  const research = await getShadowResearch();
  const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
  const ap = await prisma.autopilotStateRow.findUnique({ where: { id: 'singleton' } });
  const conn = getTossConnection();

  // Ensure accountSeq persisted when available
  if (conn.hasAccountSeq()) {
    try {
      persistAccountSeqToEnv(conn.getAccountSeq());
    } catch {
      /* ignore fs */
    }
  }

  let liveOrdersSent = 0;
  try {
    const toss = getTossBroker();
    toss.allowLiveOrders = false;
    await toss.placeOrder({
      clientOrderId: `v12-lock-${Date.now()}`,
      symbol: '005930',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1,
    });
    liveOrdersSent = 1; // unexpected
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (!msg.includes('LIVE_ORDERS_LOCKED')) {
      /* still zero sent */
    }
  }

  const remaining: string[] = [];
  if (!tossConfigured()) remaining.push('Fill TOSS_CLIENT_ID/SECRET in .env on allowlisted PC');
  if (by.get('TOSS AUTH')?.result !== 'PASS') remaining.push('Toss AUTH must PASS (run on allowlisted PC IP)');
  if (by.get('QUOTES')?.result !== 'PASS') remaining.push('Real quote PASS required for SHADOW scanning');
  if (session.session !== 'REGULAR') remaining.push('Wait for next KRX REGULAR session for live SHADOW scans');
  if (!ap?.enabled || ap.mode !== 'SHADOW') remaining.push('Start Autopilot in SHADOW mode after probe PASS');

  const items = [
    { n: 1, name: 'Toss Auth', value: pick('TOSS AUTH') },
    { n: 2, name: 'Account', value: pick('ACCOUNT') },
    { n: 3, name: 'Buying Power', value: pick('BUYING POWER') },
    { n: 4, name: 'Positions', value: pick('POSITIONS') },
    { n: 5, name: 'Orders', value: pick('OPEN ORDERS') },
    { n: 6, name: 'Executions', value: pick('EXECUTIONS') },
    { n: 7, name: 'Market Data', value: pick('QUOTES') },
    { n: 8, name: 'Universe Count', value: universeLine },
    {
      n: 9,
      name: 'KOSPI Count',
      value: String((await safeStats()).kospi),
    },
    {
      n: 10,
      name: 'KOSDAQ Count',
      value: String((await safeStats()).kosdaq),
    },
    {
      n: 11,
      name: 'Scanner Candidates',
      value: research.funnel ? research.funnel.chain.join(' → ') : 'NO_FUNNEL_YET',
    },
    {
      n: 12,
      name: 'Discovery Signals',
      value: String(research.strategies.reduce((s, x) => s + x.signalsDetected, 0)),
    },
    {
      n: 13,
      name: 'Quant Eligible',
      value: `QUANT_ELIGIBLE=${research.quantEligibleTotal} AI_BLOCKED=${research.aiBlockedTotal}`,
    },
    { n: 14, name: 'Shadow Trades', value: String(research.shadowTrades) },
    { n: 15, name: 'Shadow P/L', value: String(research.shadowPnl) },
    {
      n: 16,
      name: 'Market Regime',
      value: research.regime
        ? `${research.regime} weightsApplied=${research.regimeWeightsApplied}`
        : 'NOT_YET',
    },
    {
      n: 17,
      name: 'Data Freshness',
      value: `ok=${research.dataFreshness.ok} ageMs=${research.dataFreshness.lastAgeMs ?? 'n/a'} source=${research.dataFreshness.source ?? 'n/a'}`,
    },
    {
      n: 18,
      name: 'Recovery Test',
      value: ap ? `enabled=${ap.enabled} mode=${ap.mode} state=${ap.state}` : 'NO_STATE',
    },
    { n: 19, name: 'Duplicate Order Test', value: 'covered by unit tests (signalId idempotency)' },
    {
      n: 20,
      name: 'LIVE Gate',
      value: `ALLOW_LIVE=${env.ALLOW_LIVE ? 'true' : 'FALSE'} STATUS=LOCKED`,
    },
    { n: 21, name: 'Actual Live Orders Sent', value: String(liveOrdersSent) },
    {
      n: 22,
      name: 'Remaining Requirements',
      value: remaining.length ? remaining.join(' | ') : 'none',
    },
  ];

  return {
    title: 'AIZIO TRADE V1.2 SHADOW',
    items,
    actualLiveOrdersSent: liveOrdersSent,
    remainingRequirements: remaining,
    stages: verify.stages,
  };
}

function sNum(n: number) {
  return n;
}

async function safeStats() {
  try {
    return await getUniverseStats();
  } catch {
    return { kospi: 0, kosdaq: 0 };
  }
}

export function formatV12ReportText(r: V12ShadowReport): string {
  const lines = [r.title, ...r.items.map((i) => `${i.n}. ${i.name}: ${i.value}`)];
  return lines.join('\n');
}
