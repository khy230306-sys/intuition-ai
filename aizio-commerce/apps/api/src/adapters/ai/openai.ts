import type { ProviderStatus } from "../../shared/types.ts";
import { mapHttpToProvider, requestJson } from "../http.ts";
import type { AiProvider, ChatMessage, ChatResult, VisionResult } from "./types.ts";

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export class OpenAiAdapter implements AiProvider {
  readonly id = "openai";
  readonly label = "OpenAI";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async getStatus(): Promise<ProviderStatus> {
    if (!this.apiKey) return "NOT_CONFIGURED";
    return "READY";
  }

  async testConnection() {
    if (!this.apiKey) return { status: "NOT_CONFIGURED" as const, error: "OPENAI_API_KEY 없음" };
    const res = await requestJson<OpenAiChatResponse>("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      timeoutMs: 12_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        error: res.error ?? res.data?.error?.message ?? "OpenAI 연결 실패",
      };
    }
    return { status: "READY" as const, error: null };
  }

  async chat(messages: ChatMessage[], opts?: { json?: boolean }): Promise<ChatResult> {
    if (!this.apiKey) {
      return { status: "NOT_CONFIGURED", text: null, error: "OPENAI_API_KEY 없음", provider: this.id, usedFallback: false, source: "AI" };
    }
    const body: Record<string, unknown> = { model: this.model, messages };
    if (opts?.json) body.response_format = { type: "json_object" };
    const res = await requestJson<OpenAiChatResponse>("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      timeoutMs: 30_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        text: null,
        error: res.error ?? res.data?.error?.message ?? "OpenAI 요청 실패",
        provider: this.id,
        usedFallback: false,
        source: "AI",
      };
    }
    const text = res.data?.choices?.[0]?.message?.content ?? null;
    return { status: "READY", text, error: null, provider: this.id, usedFallback: false, source: "AI" };
  }

  async vision(): Promise<VisionResult> {
    return {
      status: "UNAVAILABLE",
      analysis: null,
      error: "Vision은 Gemini 어댑터를 우선 사용합니다.",
      provider: this.id,
    };
  }
}
