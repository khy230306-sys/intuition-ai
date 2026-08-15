import type { ChatMessage, ChatResult, VisionResult } from "../../adapters/ai/types.ts";
import type { AiProvider } from "../../adapters/ai/types.ts";
import type { ProviderStatus } from "../../shared/types.ts";

export interface ProviderSnapshot {
  id: string;
  label: string;
  status: ProviderStatus;
  lastError: string | null;
  lastSuccessAt: string | null;
}

export class ProviderRegistry {
  constructor(private readonly providers: AiProvider[]) {}

  ordered(): AiProvider[] {
    const rank = ["openai", "gemini", "claude"];
    return [...this.providers].sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id));
  }

  get(id: string): AiProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  async snapshots(): Promise<ProviderSnapshot[]> {
    const out: ProviderSnapshot[] = [];
    for (const p of this.ordered()) {
      const status = await p.getStatus();
      out.push({ id: p.id, label: p.label, status, lastError: null, lastSuccessAt: null });
    }
    return out;
  }

  async chatWithFallback(messages: ChatMessage[], opts?: { json?: boolean }): Promise<ChatResult> {
    let last: ChatResult | null = null;
    let attempted = 0;
    for (const provider of this.ordered()) {
      const status = await provider.getStatus();
      if (status === "NOT_CONFIGURED") continue;
      attempted += 1;
      const result = await provider.chat(messages, opts);
      if (result.status === "READY" && result.text) {
        return { ...result, usedFallback: attempted > 1 };
      }
      last = { ...result, usedFallback: attempted > 1 };
      if (result.status === "AUTH_FAILED") continue;
    }
    return (
      last ?? {
        status: "NOT_CONFIGURED",
        text: null,
        error: "연결된 AI Provider가 없습니다.",
        provider: "none",
        usedFallback: false,
        source: "AI",
      }
    );
  }

  async vision(imageBase64: string, mimeType: string, prompt: string): Promise<VisionResult> {
    const gemini = this.get("gemini");
    if (gemini?.vision) {
      return gemini.vision(imageBase64, mimeType, prompt);
    }
    for (const p of this.ordered()) {
      if (p.vision) return p.vision(imageBase64, mimeType, prompt);
    }
    return {
      status: "NOT_CONFIGURED",
      analysis: null,
      error: "Vision Provider가 PENDING_SETUP 입니다.",
      provider: "none",
    };
  }
}
