/**
 * Local Toss connectivity probe (run on allowlisted PC IP).
 * Never prints secret values.
 */
import { tossConfigured, tossCredentialsPresent, env } from '../src/config/env.js';
import {
  TossConnectionManager,
  classifyAuthError,
  resetTossConnectionForTests,
} from '../src/brokers/tossConnection.js';
import { TossBrokerAdapter } from '../src/brokers/tossBroker.js';
import { refreshUniverse, getUniverseStats } from '../src/services/universe.js';
import { getMarketSession } from '../src/engines/marketSession.js';

const c = tossCredentialsPresent();
console.log('=== AIZIO TRADE Toss Probe (local) ===');
console.log(
  'CRED',
  `ID=${c.clientId ? 'CONFIGURED' : 'MISSING'} SECRET=${c.clientSecret ? 'CONFIGURED' : 'MISSING'} SEQ=${c.accountSeq ? 'CONFIGURED' : 'AUTO'} ALLOW_LIVE=${env.ALLOW_LIVE} tossConfigured=${tossConfigured()}`,
);

if (!tossConfigured()) {
  console.log(`
Toss OpenAPI credential이 필요합니다.
.env 파일에 직접 입력하세요.
TOSS_CLIENT_ID=
TOSS_CLIENT_SECRET=
TOSS_ACCOUNT_SEQ=
입력 후 서버를 재시작하세요.
(ACCOUNT_SEQ는 비워도 됩니다.)
`);
  process.exit(1);
}

const mgr = new TossConnectionManager();
resetTossConnectionForTests(mgr);
const toss = new TossBrokerAdapter(mgr);
const report: Record<string, string> = {};

async function step(name: string, fn: () => Promise<string>) {
  try {
    report[name] = `PASS ${await fn()}`;
  } catch (e) {
    report[name] = `FAIL ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
  }
}

try {
  await mgr.authenticate();
  report.AUTH = `PASS ${mgr.getState()}`;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  report.AUTH = `FAIL ${classifyAuthError(msg)} ${msg.slice(0, 160)}`;
  console.log(JSON.stringify(report, null, 2));
  console.log('\nIf IP_NOT_ALLOWED: add THIS PC public IP in Toss Open API allowlist, then retry.');
  process.exit(1);
}

await step('ACCOUNT_SEQ', async () => {
  const seq = await mgr.ensureAccountSeq();
  return `auto_or_env len=${String(seq).length}`;
});
await step('ACCOUNT', async () => {
  const a = await toss.getAccount();
  return `type=${a.accountType}`;
});
await step('BUYING_POWER', async () => {
  const b = await toss.getBuyingPower();
  return `ccy=${b.currency}`;
});
await step('POSITIONS', async () => `count=${(await toss.getPositions()).length}`);
await step('OPEN_ORDERS', async () => `count=${(await toss.getOpenOrders()).length}`);
await step('EXECUTIONS', async () => `count=${(await toss.getExecutions()).length}`);
await step('QUOTE', async () => {
  const q = await toss.getQuote('005930');
  return `src=${q.source} px=${q.lastPrice} ageMs=${q.freshnessMs}`;
});
await step('UNIVERSE', async () => {
  await refreshUniverse(true);
  const s = await getUniverseStats();
  return `source=${s.source} total=${s.total} kospi=${s.kospi} kosdaq=${s.kosdaq}`;
});
await step('MARKET_SESSION', async () => {
  const s = await getMarketSession('KR', { preferTossCalendar: true });
  return `${s.tradingDate} ${s.session} open=${s.isOpen}`;
});

try {
  await toss.placeOrder({
    clientOrderId: 'probe-lock',
    symbol: '005930',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: 1,
  });
  report.LIVE_ORDER = 'FAIL unexpectedly accepted';
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  report.LIVE_ORDER = msg.includes('LIVE_ORDERS_LOCKED') ? 'PASS LOCKED (0 sent)' : `FAIL ${msg.slice(0, 120)}`;
}

console.log(JSON.stringify(report, null, 2));
const critical = ['AUTH', 'ACCOUNT', 'BUYING_POWER', 'QUOTE'];
const ok = critical.every((k) => String(report[k] ?? '').startsWith('PASS'));
console.log(ok ? '\nSHADOW readiness: OK — start with npm run dev, mode=SHADOW' : '\nSHADOW readiness: BLOCKED');
process.exit(ok ? 0 : 1);
