import type { ProviderStatus, VisionAnalysis } from "../../shared/types.ts";
import { mapHttpToProvider, requestJson } from "../http.ts";
import type { AiProvider, ChatMessage, ChatResult, VisionResult } from "./types.ts";

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; code?: number };
}

function extractText(data: GeminiResponse | null): string | null {
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") || null;
}

export class GeminiAdapter implements AiProvider {
  readonly id = "gemini";
  readonly label = "Gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async getStatus(): Promise<ProviderStatus> {
    if (!this.apiKey) return "NOT_CONFIGURED";
    return "READY";
  }

  private endpoint(method: "generateContent") {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:${method}?key=${this.apiKey}`;
  }

  async testConnection() {
    if (!this.apiKey) return { status: "NOT_CONFIGURED" as const, error: "GEMINI_API_KEY 없음" };
    const res = await requestJson<GeminiResponse>(this.endpoint("generateContent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      timeoutMs: 12_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        error: res.error ?? res.data?.error?.message ?? "Gemini 연결 실패",
      };
    }
    return { status: "READY" as const, error: null };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    if (!this.apiKey) {
      return { status: "NOT_CONFIGURED", text: null, error: "GEMINI_API_KEY 없음", provider: this.id, usedFallback: false, source: "AI" };
    }
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const system = messages.find((m) => m.role === "system")?.content;
    const res = await requestJson<GeminiResponse>(this.endpoint("generateContent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
      }),
      timeoutMs: 30_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        text: null,
        error: res.error ?? res.data?.error?.message ?? "Gemini 요청 실패",
        provider: this.id,
        usedFallback: false,
        source: "AI",
      };
    }
    return {
      status: "READY",
      text: extractText(res.data),
      error: null,
      provider: this.id,
      usedFallback: false,
      source: "AI",
    };
  }

  async vision(imageBase64: string, mimeType: string, prompt: string): Promise<VisionResult> {
    if (!this.apiKey) {
      return { status: "NOT_CONFIGURED", analysis: null, error: "GEMINI_API_KEY 없음", provider: this.id };
    }
    const res = await requestJson<GeminiResponse>(this.endpoint("generateContent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
      timeoutMs: 40_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        analysis: null,
        error: res.error ?? res.data?.error?.message ?? "Gemini Vision 실패",
        provider: this.id,
      };
    }
    const text = extractText(res.data);
    if (!text) {
      return { status: "DEGRADED", analysis: null, error: "빈 Vision 응답", provider: this.id };
    }
    try {
      const parsed = JSON.parse(text) as Partial<VisionAnalysis>;
      const analysis: VisionAnalysis = {
        category: parsed.category ?? null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        productType: parsed.productType ?? parsed.category ?? null,
        features: parsed.features ?? [],
        estimatedCategory: parsed.estimatedCategory ?? parsed.category ?? null,
        material: parsed.material ?? null,
        colors: parsed.colors ?? [],
        designTraits: parsed.designTraits ?? [],
        brandVisible: Boolean(parsed.brandVisible),
        possibleBrand: parsed.possibleBrand ?? null,
        modelNameCandidates: parsed.modelNameCandidates ?? [],
        supplierSearchKeywords: parsed.supplierSearchKeywords ?? [],
        domesticMarketKeywords: parsed.domesticMarketKeywords ?? [],
        similarProductQuery: parsed.similarProductQuery ?? null,
        source: "AI",
        provider: this.id,
      };
      return { status: "READY", analysis, error: null, provider: this.id };
    } catch {
      return { status: "DEGRADED", analysis: null, error: "Vision JSON 파싱 실패", provider: this.id };
    }
  }
}
