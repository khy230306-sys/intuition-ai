import { RISK_PRESETS, type AutopilotState, type RiskLevel, type StopMode, type TradingMode } from '@aizio/trade-shared';
import { prisma } from '../db/client.js';
import { env, tossConfigured } from '../config/env.js';
import { emitEvent } from './events.js';
import { getPaperBroker, rebindPaperMarketData } from '../brokers/index.js';

export async function ensureAutopilotRow() {
  const existing = await prisma.autopilotStateRow.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.autopilotStateRow.create({
    data: {
      id: 'singleton',
      enabled: false,
      state: 'OFF',
      mode: env.DEFAULT_MODE,
      capital: env.DEFAULT_CAPITAL,
      riskLevel: 'BALANCED',
      readiness: 'NOT_CONFIGURED',
    },
  });
}

export async function getAutopilot() {
  return ensureAutopilotRow();
}

export async function startAutopilot(opts: {
  capital: number;
  riskLevel: RiskLevel;
  mode?: TradingMode;
}) {
  const mode = opts.mode ?? 'PAPER';
  if (mode === 'LIVE' && !env.ALLOW_LIVE) {
    throw new Error('LIVE_NOT_ALLOWED');
  }
  if ((mode === 'LIVE' || mode === 'LIVE_OBSERVE' || mode === 'SHADOW') && !tossConfigured()) {
    throw new Error('TOSS_NOT_CONFIGURED');
  }
  const paper = getPaperBroker(opts.capital);
  if (mode === 'SHADOW') rebindPaperMarketData('SHADOW');
  if (mode === 'PAPER' || mode === 'PAPER_REPLAY') rebindPaperMarketData('PAPER_REPLAY');
  if (mode !== 'LIVE' && mode !== 'LIVE_OBSERVE') {
    await paper.resetLedger(opts.capital);
  } else {
    await paper.connect();
  }

  const profile = RISK_PRESETS[opts.riskLevel];
  await prisma.riskProfileRow.updateMany({ data: { active: false } });
  await prisma.riskProfileRow.create({
    data: {
      name: opts.riskLevel,
      maxCapital: opts.capital,
      maxPositionPct: profile.maxPositionPct,
      maxOpenPositions: profile.maxOpenPositions,
      maxDailyLossPct: profile.maxDailyLossPct,
      maxDrawdownPct: profile.maxDrawdownPct,
      riskPerTradePct: profile.riskPerTradePct,
      maxConsecutiveLosses: profile.maxConsecutiveLosses,
      maxSlippagePct: profile.maxSlippagePct,
      maxSpreadPct: profile.maxSpreadPct,
      active: true,
    },
  });

  const row = await prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: {
      enabled: true,
      state: 'STARTING',
      mode,
      stopMode: 'NONE',
      startedAt: new Date(),
      stoppedAt: null,
      haltReason: null,
      capital: opts.capital,
      riskLevel: opts.riskLevel,
      circuitBreakerOn: false,
      aiStatusText: '시장 탐색 준비',
      readiness:
        mode === 'PAPER' || mode === 'PAPER_REPLAY'
          ? 'PAPER_MODE'
          : mode === 'SHADOW'
            ? 'SHADOW'
            : mode === 'LIVE_OBSERVE'
              ? 'LIVE_OBSERVE'
              : 'LIVE_READY',
      lastHeartbeatAt: new Date(),
    },
  });
  await emitEvent('AUTOPILOT_START', `자동매매 시작 (${mode})`, 'info', { capital: opts.capital, riskLevel: opts.riskLevel });
  return row;
}

export async function stopAutopilot(stopMode: StopMode) {
  const state: AutopilotState =
    stopMode === 'CLOSE_AND_STOP' ? 'HALTED' : stopMode === 'STOP_NEW_ENTRIES' ? 'PAUSED' : 'OFF';
  const enabled = stopMode === 'STOP_NEW_ENTRIES';
  const row = await prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: {
      enabled,
      state: stopMode === 'NONE' ? 'OFF' : state,
      stopMode,
      stoppedAt: stopMode === 'STOP_NEW_ENTRIES' ? null : new Date(),
      ...(stopMode === 'NONE' || stopMode === 'CLOSE_AND_STOP'
        ? { enabled: false, state: stopMode === 'CLOSE_AND_STOP' ? 'HALTED' : 'OFF' }
        : {}),
      aiStatusText: stopMode === 'STOP_NEW_ENTRIES' ? '신규매수 중지' : '중지됨',
    },
  });
  await emitEvent('AUTOPILOT_STOP', `자동매매 중지: ${stopMode}`, 'warn', { stopMode });
  return row;
}

export async function emergencyStop() {
  const row = await prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: {
      enabled: false,
      state: 'HALTED',
      stopMode: 'CLOSE_AND_STOP',
      circuitBreakerOn: true,
      haltReason: 'EMERGENCY_STOP',
      stoppedAt: new Date(),
      aiStatusText: '긴급정지',
      readiness: 'HALTED',
    },
  });
  await emitEvent('EMERGENCY_STOP', '긴급정지 — 신규주문 차단', 'error');
  return row;
}

export async function setState(state: AutopilotState, extra: Record<string, unknown> = {}) {
  return prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: { state, ...extra },
  });
}

export async function heartbeat(aiStatusText?: string) {
  return prisma.autopilotStateRow.update({
    where: { id: 'singleton' },
    data: {
      lastHeartbeatAt: new Date(),
      ...(aiStatusText ? { aiStatusText } : {}),
    },
  });
}

export async function getActiveRiskProfile() {
  const row = await prisma.riskProfileRow.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  const ap = await getAutopilot();
  if (row) {
    return {
      maxCapital: row.maxCapital,
      maxPositionPct: row.maxPositionPct,
      maxOpenPositions: row.maxOpenPositions,
      maxDailyLossPct: row.maxDailyLossPct,
      maxDrawdownPct: row.maxDrawdownPct,
      riskPerTradePct: row.riskPerTradePct,
      maxConsecutiveLosses: row.maxConsecutiveLosses,
      maxSlippagePct: row.maxSlippagePct,
      maxSpreadPct: row.maxSpreadPct,
    };
  }
  const preset = RISK_PRESETS[(ap.riskLevel as RiskLevel) || 'BALANCED'];
  return { ...preset, maxCapital: ap.capital };
}
