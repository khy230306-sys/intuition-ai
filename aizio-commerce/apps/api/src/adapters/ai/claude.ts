import type { ProviderStatus } from "../../shared/types.ts";
import { mapHttpToProvider, requestJson } from "../http.ts";
import type { AiProvider, ChatMessage, ChatResult } from "./types.ts";

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
}

export class ClaudeAdapter implements AiProvider {
  readonly id = "claude";
  readonly label = "Claude";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async getStatus(): Promise<ProviderStatus> {
    if (!this.apiKey) return "NOT_CONFIGURED";
    return "READY";
  }

  async testConnection() {
    if (!this.apiKey) return { status: "NOT_CONFIGURED" as const, error: "ANTHROPIC_API_KEY 없음" };
    const res = await requestJson<ClaudeResponse>("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8,
        messages: [{ role: "user", content: "ping" }],
      }),
      timeoutMs: 12_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        error: res.error ?? res.data?.error?.message ?? "Claude 연결 실패",
      };
    }
    return { status: "READY" as const, error: null };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    if (!this.apiKey) {
      return { status: "NOT_CONFIGURED", text: null, error: "ANTHROPIC_API_KEY 없음", provider: this.id, usedFallback: false, source: "AI" };
    }
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages.filter((m) => m.role !== "system");
    const res = await requestJson<ClaudeResponse>("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: rest,
      }),
      timeoutMs: 30_000,
    });
    if (!res.ok) {
      return {
        status: mapHttpToProvider(res.status, res.timedOut),
        text: null,
        error: res.error ?? res.data?.error?.message ?? "Claude 요청 실패",
        provider: this.id,
        usedFallback: false,
        source: "AI",
      };
    }
    const text = res.data?.content?.map((c) => c.text ?? "").join("") || null;
    return { status: "READY", text, error: null, provider: this.id, usedFallback: false, source: "AI" };
  }
}
