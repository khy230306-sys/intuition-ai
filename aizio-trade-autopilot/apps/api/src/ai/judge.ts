import { aiConfigured, env } from '../config/env.js';
import type { DiscoverySignal } from '@aizio/trade-shared';
import type { QuantResult } from '../engines/quant.js';
import type { ScanCandidate } from '../engines/scanner.js';
import { AITradeDecisionSchema, type ValidatedAITradeDecision } from './schemas.js';

export interface JudgeInput {
  candidate: ScanCandidate;
  quant: QuantResult;
  signals: DiscoverySignal[];
  regime: string;
}

export interface JudgeResult {
  decision: ValidatedAITradeDecision | null;
  valid: boolean;
  providerStatus: 'OK' | 'NOT_CONFIGURED' | 'TIMEOUT' | 'MALFORMED' | 'ERROR' | 'DETERMINISTIC';
  error?: string;
}

/** Deterministic bull/bear/risk synthesis used when AI provider is absent or as fail-safe baseline. */
export function deterministicJudge(input: JudgeInput): JudgeResult {
  const { candidate, quant, signals } = input;
  const bull = Math.min(100, quant.total + Math.max(0, candidate.quote.changePct) * 5);
  const bear =
    Math.min(100, Math.max(0, -candidate.quote.changePct) * 8 + candidate.spreadPct * 20 + (quant.total < 40 ? 30 : 0));
  const dataQuality = candidate.quote.source === 'TOSS' ? 90 : candidate.quote.source === 'REPLAY' ? 70 : 50;
  let action: 'BUY' | 'WATCH' | 'REJECT' = 'WATCH';
  if (quant.total >= 55 && bull > bear + 8 && candidate.quote.changePct > 0) action = 'BUY';
  if (bear >= bull || quant.total < 35 || dataQuality < 40) action = 'REJECT';

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
    generatedAt: new Date().toISOString(),
  });

  return {
    decision,
    valid: true,
    providerStatus: aiConfigured() ? 'DETERMINISTIC' : 'NOT_CONFIGURED',
  };
}

export async function runAiJudge(input: JudgeInput): Promise<JudgeResult> {
  if (!aiConfigured()) {
    // Fail-safe default: NO AI CONFIDENCE → treat deterministic as advisory only.
    const det = deterministicJudge(input);
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);
  try {
    const prompt = {
      role: 'system',
      content:
        'You are AIZIO Final Judge. Return ONLY JSON matching schema: symbol,action(BUY|WATCH|REJECT),confidence,bullScore,bearScore,dataQuality,reasons,risks,generatedAt. Bull must justify entry; Bear must argue against.',
    };
    const user = {
      role: 'user',
      content: JSON.stringify({
        candidate: input.candidate,
        quant: input.quant,
        signals: input.signals,
        regime: input.regime,
      }),
    };
    const res = await fetch(`${env.AI_PROVIDER_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_PROVIDER_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [prompt, user],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { decision: null, valid: false, providerStatus: 'ERROR', error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { decision: null, valid: false, providerStatus: 'MALFORMED', error: 'empty' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { decision: null, valid: false, providerStatus: 'MALFORMED', error: 'json-parse' };
    }
    const decision = AITradeDecisionSchema.safeParse(parsed);
    if (!decision.success) {
      return { decision: null, valid: false, providerStatus: 'MALFORMED', error: decision.error.message };
    }
    return { decision: decision.data, valid: true, providerStatus: 'OK' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error';
    if (msg.includes('abort')) {
      return { decision: null, valid: false, providerStatus: 'TIMEOUT', error: msg };
    }
    return { decision: null, valid: false, providerStatus: 'ERROR', error: msg };
  } finally {
    clearTimeout(timer);
  }
}
