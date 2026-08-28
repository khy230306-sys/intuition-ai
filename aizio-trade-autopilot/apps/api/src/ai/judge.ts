import { aiConfigured, env } from '../config/env.js';
import type { DiscoverySignal } from '@aizio/trade-shared';
import type { QuantResult } from '../engines/quant.js';
import type { ScanCandidate } from '../engines/scanner.js';
import { AITradeDecisionSchema, type ValidatedAITradeDecision } from './schemas.js';
import { getAiProvider } from './providers.js';

export interface JudgeInput {
  candidate: ScanCandidate;
  quant: QuantResult;
  signals: DiscoverySignal[];
  regime: string;
  signalCreatedAt?: string;
}

export interface JudgeResult {
  decision: ValidatedAITradeDecision | null;
  valid: boolean;
  providerStatus: 'OK' | 'NOT_CONFIGURED' | 'TIMEOUT' | 'MALFORMED' | 'ERROR' | 'DETERMINISTIC' | 'STALE_DECISION';
  error?: string;
}

export function deterministicJudge(input: JudgeInput): JudgeResult {
  const { candidate, quant, signals } = input;
  const bull = Math.min(100, quant.total + Math.max(0, candidate.quote.changePct) * 5);
  const bear =
    Math.min(100, Math.max(0, -candidate.quote.changePct) * 8 + candidate.spreadPct * 20 + (quant.total < 40 ? 30 : 0));
  const dataQuality = candidate.quote.source === 'TOSS' ? 90 : candidate.quote.source === 'REPLAY' ? 70 : 50;
  let action: 'BUY' | 'WATCH' | 'REJECT' = 'WATCH';
  if (quant.total >= 48 && bull > bear + 5 && candidate.quote.changePct > 0.2) action = 'BUY';
  if (bear >= bull || quant.total < 35 || dataQuality < 40) action = 'REJECT';

  const generatedAt = new Date().toISOString();
  const signalCreatedAt = input.signalCreatedAt ?? generatedAt;
  const decisionAgeMs = Date.now() - new Date(signalCreatedAt).getTime();

  const decision = AITradeDecisionSchema.parse({
    symbol: candidate.symbol,
    action,
    confidence: Math.min(0.95, Math.max(0.2, (bull - bear) / 100 + quant.total / 200)),
    bullScore: bull,
    bearScore: bear,
    dataQuality,
    reasons: [
      `Quant ${quant.total}`,
      `Signals: ${signals.map((s) => s.strategyId).join(',') || 'none'}`,
      action === 'BUY' ? '증거 기반 진입 가치 존재' : '관망/거절',
    ],
    risks: [
      bear > 50 ? '과열/반락 위험' : '일반 변동성',
      candidate.spreadPct > 0.5 ? '스프레드 확대' : '스프레드 정상',
    ],
    generatedAt,
    signalCreatedAt,
    aiStartedAt: generatedAt,
    aiCompletedAt: generatedAt,
    decisionAgeMs,
  });

  return {
    decision,
    valid: true,
    providerStatus: aiConfigured() ? 'DETERMINISTIC' : 'NOT_CONFIGURED',
  };
}

export async function runAiJudge(input: JudgeInput): Promise<JudgeResult> {
  const signalCreatedAt = input.signalCreatedAt ?? new Date().toISOString();

  if (!aiConfigured()) {
    const det = deterministicJudge({ ...input, signalCreatedAt });
    if (env.AI_REQUIRED_FOR_ENTRY) {
      return {
        decision: {
          ...det.decision!,
          action: det.decision!.action === 'BUY' ? 'WATCH' : det.decision!.action,
          reasons: [...det.decision!.reasons, 'AI_REQUIRED_FOR_ENTRY: provider NOT_CONFIGURED → no new entry'],
        },
        valid: true,
        providerStatus: 'NOT_CONFIGURED',
      };
    }
    return det;
  }

  const provider = getAiProvider();
  const aiStartedAt = new Date().toISOString();
  try {
    const content = await provider.complete(
      [
        {
          role: 'system',
          content:
            'You are AIZIO Final Judge. Return ONLY JSON matching schema: symbol,action(BUY|WATCH|REJECT),confidence,bullScore,bearScore,dataQuality,reasons,risks,generatedAt. Bull must justify entry; Bear must argue against. News alone must not force BUY.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            candidate: input.candidate,
            quant: input.quant,
            signals: input.signals,
            regime: input.regime,
            signalCreatedAt,
          }),
        },
      ],
      { timeoutMs: env.AI_TIMEOUT_MS },
    );
    const aiCompletedAt = new Date().toISOString();
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { decision: null, valid: false, providerStatus: 'MALFORMED', error: 'json-parse' };
    }
    const decision = AITradeDecisionSchema.safeParse({
      ...(parsed as object),
      signalCreatedAt,
      aiStartedAt,
      aiCompletedAt,
      decisionAgeMs: Date.now() - new Date(signalCreatedAt).getTime(),
    });
    if (!decision.success) {
      return { decision: null, valid: false, providerStatus: 'MALFORMED', error: decision.error.message };
    }
    if ((decision.data.decisionAgeMs ?? 0) > env.AI_MAX_DECISION_AGE_MS) {
      return {
        decision: { ...decision.data, action: 'REJECT', reasons: [...decision.data.reasons, 'STALE_DECISION'] },
        valid: false,
        providerStatus: 'STALE_DECISION',
        error: 'decision_too_old',
      };
    }
    return { decision: decision.data, valid: true, providerStatus: 'OK' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    if (msg.includes('abort')) {
      return { decision: null, valid: false, providerStatus: 'TIMEOUT', error: msg };
    }
    return { decision: null, valid: false, providerStatus: 'ERROR', error: msg };
  }
}
