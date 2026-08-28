import type { GateResult, LiveGateCheck } from '@aizio/trade-shared';
import { env, tossConfigured, tossCredentialsPresent } from '../config/env.js';
import { getTossConnection } from '../brokers/tossConnection.js';
import { getTossBroker } from '../brokers/index.js';
import { getMarketSession } from '../engines/marketSession.js';
import { refreshUniverse, getUniverseStats } from './universe.js';
import { prisma } from '../db/client.js';
import { emitEvent } from './events.js';

export interface VerifyStage extends LiveGateCheck {
  name: string;
  result: GateResult;
  detail: string;
  ms?: number;
}

export interface CredentialGuidance {
  needed: boolean;
  message: string;
  fields: string[];
}

export function credentialGuidance(): CredentialGuidance {
  const c = tossCredentialsPresent();
  const needed = !(c.clientId && c.clientSecret);
  return {
    needed,
    fields: ['TOSS_CLIENT_ID', 'TOSS_CLIENT_SECRET', 'TOSS_ACCOUNT_SEQ'],
    message: needed
      ? [
          'Toss OpenAPI credential이 필요합니다.',
          '.env 파일에 직접 입력하세요.',
          'TOSS_CLIENT_ID=',
          'TOSS_CLIENT_SECRET=',
          'TOSS_ACCOUNT_SEQ=',
          '입력 후 서버를 재시작하세요.',
          '(ACCOUNT_SEQ는 비워도 됩니다. 서버가 계좌 목록에서 자동 조회합니다.)',
        ].join('\n')
      : 'Toss credentials CONFIGURED (values not shown)',
  };
}

function stage(name: string, result: GateResult, detail: string, ms?: number): VerifyStage {
  return { name, result, detail, ms };
}

/**
 * Ordered read-only verification. A failed stage never marks later stages PASS falsely —
 * each stage records its own independent outcome.
 */
export async function runShadowConnectionVerify(): Promise<{
  stages: VerifyStage[];
  allCriticalPass: boolean;
  guidance: CredentialGuidance;
}> {
  const stages: VerifyStage[] = [];
  const guidance = credentialGuidance();
  const creds = tossCredentialsPresent();
  const credOk = creds.clientId && creds.clientSecret;

  stages.push(
    stage(
      'TOSS CREDENTIALS',
      credOk ? 'PASS' : 'FAIL',
      `ID=${creds.clientId ? 'CONFIGURED' : 'MISSING'} SECRET=${creds.clientSecret ? 'CONFIGURED' : 'MISSING'} SEQ=${creds.accountSeq ? 'CONFIGURED' : 'AUTO'}`,
    ),
  );

  if (!credOk) {
    for (const name of [
      'TOSS AUTH',
      'ACCOUNT',
      'BUYING POWER',
      'POSITIONS',
      'OPEN ORDERS',
      'EXECUTIONS',
      'QUOTES',
      'UNIVERSE',
      'MARKET SESSION',
    ]) {
      stages.push(stage(name, 'FAIL', 'NOT_CONFIGURED'));
    }
    await persist(stages);
    return { stages, allCriticalPass: false, guidance };
  }

  const conn = getTossConnection();
  const toss = getTossBroker();

  // AUTH
  {
    const t0 = Date.now();
    try {
      await conn.authenticate();
      stages.push(stage('TOSS AUTH', 'PASS', conn.getState(), Date.now() - t0));
    } catch (e) {
      stages.push(stage('TOSS AUTH', 'FAIL', e instanceof Error ? e.message : 'auth-fail', Date.now() - t0));
    }
  }

  // Independent stages — each try/catch own result
  {
    const t0 = Date.now();
    try {
      await toss.getAccount();
      stages.push(stage('ACCOUNT', 'PASS', 'account lookup ok', Date.now() - t0));
    } catch (e) {
      stages.push(stage('ACCOUNT', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const bp = await toss.getBuyingPower();
      stages.push(stage('BUYING POWER', 'PASS', `currency=${bp.currency}`, Date.now() - t0));
    } catch (e) {
      stages.push(stage('BUYING POWER', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const pos = await toss.getPositions();
      stages.push(stage('POSITIONS', 'PASS', `count=${pos.length}`, Date.now() - t0));
    } catch (e) {
      stages.push(stage('POSITIONS', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const oo = await toss.getOpenOrders();
      stages.push(stage('OPEN ORDERS', 'PASS', `count=${oo.length}`, Date.now() - t0));
    } catch (e) {
      stages.push(stage('OPEN ORDERS', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const ex = await toss.getExecutions();
      stages.push(stage('EXECUTIONS', 'PASS', `count=${ex.length}`, Date.now() - t0));
    } catch (e) {
      stages.push(stage('EXECUTIONS', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
      const regular = session.isTradingDay && session.session === 'REGULAR';
      const q = await toss.getQuote('005930');
      const fresh = q.freshnessMs <= env.FRESHNESS_KR_MS;
      const sourceOk = q.source === 'TOSS';
      let result: GateResult = 'FAIL';
      let detail = `source=${q.source} ageMs=${q.freshnessMs}`;
      if (q.lastPrice > 0 && sourceOk) {
        if (fresh) result = 'PASS';
        else if (!regular) {
          result = 'PASS';
          detail += ' expected_stale_when_closed';
        } else result = 'WARN';
      }
      stages.push(stage('QUOTES', result, detail, Date.now() - t0));
    } catch (e) {
      stages.push(stage('QUOTES', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      await refreshUniverse(true);
      const stats = await getUniverseStats();
      const live = stats.source === 'TOSS';
      stages.push(
        stage(
          'UNIVERSE',
          live && stats.total > 100 ? 'PASS' : live ? 'WARN' : 'FAIL',
          `source=${stats.source} total=${stats.total} kospi=${stats.kospi} kosdaq=${stats.kosdaq}`,
          Date.now() - t0,
        ),
      );
    } catch (e) {
      stages.push(stage('UNIVERSE', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }
  {
    const t0 = Date.now();
    try {
      const session = await getMarketSession('KR', { preferTossCalendar: tossConfigured() });
      const regular = session.isTradingDay && session.session === 'REGULAR';
      stages.push(
        stage(
          'MARKET SESSION',
          'PASS',
          regular
            ? `${session.tradingDate} REGULAR open`
            : `${session.tradingDate} ${session.session} SHADOW_WAITING_OK`,
          Date.now() - t0,
        ),
      );
    } catch (e) {
      stages.push(stage('MARKET SESSION', 'FAIL', e instanceof Error ? e.message : 'fail', Date.now() - t0));
    }
  }

  stages.push(stage('ALLOW_LIVE', env.ALLOW_LIVE ? 'WARN' : 'PASS', env.ALLOW_LIVE ? 'true' : 'FALSE'));
  stages.push(stage('LIVE STATUS', env.ALLOW_LIVE ? 'WARN' : 'PASS', env.ALLOW_LIVE ? 'UNLOCKED_FLAG' : 'LOCKED'));

  // QUOTES may be WARN during REGULAR; PASS when closed+stale is OK. AUTH/ACCOUNT/BP/UNIVERSE/SESSION required.
  const critical = ['TOSS AUTH', 'ACCOUNT', 'BUYING POWER', 'UNIVERSE', 'MARKET SESSION'];
  const by = new Map(stages.map((s) => [s.name, s]));
  const quotesOk = by.get('QUOTES')?.result === 'PASS' || by.get('QUOTES')?.result === 'WARN';
  const allCriticalPass = critical.every((n) => by.get(n)?.result === 'PASS') && quotesOk;

  await persist(stages);
  await emitEvent(
    allCriticalPass ? 'SHADOW_VERIFY_PASS' : 'SHADOW_VERIFY_FAIL',
    `Shadow verify criticalPass=${allCriticalPass}`,
    allCriticalPass ? 'info' : 'warn',
  );

  return { stages, allCriticalPass, guidance };
}

async function persist(stages: VerifyStage[]) {
  await prisma.configKv.upsert({
    where: { key: 'shadow_verify' },
    create: {
      key: 'shadow_verify',
      valueJson: JSON.stringify({ stages, at: new Date().toISOString() }),
    },
    update: {
      valueJson: JSON.stringify({ stages, at: new Date().toISOString() }),
    },
  });
}

export async function getLastShadowVerify(): Promise<{ stages: VerifyStage[]; at?: string } | null> {
  const row = await prisma.configKv.findUnique({ where: { key: 'shadow_verify' } });
  if (!row) return null;
  try {
    return JSON.parse(row.valueJson) as { stages: VerifyStage[]; at?: string };
  } catch {
    return null;
  }
}
