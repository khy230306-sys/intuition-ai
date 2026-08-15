import type { ProviderRegistry } from "./provider-registry.ts";
import type { RiskDecision } from "../../shared/types.ts";

const SYSTEM = `당신은 AIZIO COMMERCE Manager AI입니다.
역할: 상품 판단, 분류, 추천 설명.
금지: 금액 계산, 마진 계산, Risk BLOCK 해제, 발주/환불/판매등록 자동 승인.
숫자는 코드 엔진이 계산한 값만 인용하세요. 없는 숫자를 만들지 마세요.
AI 실패는 판매·발주·환불을 승인하는 이유가 될 수 없습니다.`;

export class ManagerAi {
  constructor(private readonly registry: ProviderRegistry) {}

  async explainRecommendation(input: {
    title: string;
    profit: { expectedNetProfit: number; netMarginRate: number; missingInputs: string[] };
    risk: { decision: RiskDecision; findings: Array<{ label: string }> };
    reasons: string[];
    warnings: string[];
  }): Promise<{ source: "AI" | "CODE"; text: string; provider: string | null; status: string }> {
    if (input.risk.decision === "BLOCK") {
      return {
        source: "CODE",
        text: "이 상품은 Risk Engine이 BLOCK 했습니다. Manager AI가 해제할 수 없습니다.",
        provider: null,
        status: "BLOCKED",
      };
    }
    const result = await this.registry.chatWithFallback([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          expectedNetProfit: input.profit.expectedNetProfit,
          netMarginRate: input.profit.netMarginRate,
          missingInputs: input.profit.missingInputs,
          risk: input.risk.decision,
          reasons: input.reasons,
          warnings: input.warnings,
          instruction: "한국어로 초보자가 이해할 2~4문장 설명. 새 숫자를 만들지 마세요.",
        }),
      },
    ]);
    if (result.status !== "READY" || !result.text) {
      return {
        source: "CODE",
        text: input.reasons.join(" ") || "추천 근거를 코드 엔진에서 계산했습니다.",
        provider: result.provider,
        status: result.status,
      };
    }
    return { source: "AI", text: result.text, provider: result.provider, status: result.status };
  }

  async classifyCommand(text: string): Promise<{ intent: string; slots: Record<string, string>; source: "AI" | "CODE" }> {
    const result = await this.registry.chatWithFallback(
      [
        {
          role: "system",
          content:
            'JSON only: {"intent": string, "slots": {}}. intents: scout, recommendations, filter_margin, high_return, pause_loss, orders_today, cost_up, profit_month, unknown',
        },
        { role: "user", content: text },
      ],
      { json: true },
    );
    if (result.status === "READY" && result.text) {
      try {
        const parsed = JSON.parse(result.text) as { intent?: string; slots?: Record<string, string> };
        return { intent: parsed.intent ?? "unknown", slots: parsed.slots ?? {}, source: "AI" };
      } catch {
        /* fall through to code router */
      }
    }
    return { intent: "unknown", slots: {}, source: "CODE" };
  }
}
