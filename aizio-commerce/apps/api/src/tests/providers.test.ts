import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAiAdapter } from "../adapters/ai/openai.ts";
import { GeminiAdapter } from "../adapters/ai/gemini.ts";
import { ClaudeAdapter } from "../adapters/ai/claude.ts";
import { ProviderRegistry } from "../engines/manager/provider-registry.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown, delay = 0) {
  return vi.fn(async () => {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
}

describe("AI providers", () => {
  it("reports NOT_CONFIGURED without API key", async () => {
    const openai = new OpenAiAdapter("", "gpt-4.1-mini");
    const gemini = new GeminiAdapter("", "gemini-2.0-flash");
    const claude = new ClaudeAdapter("", "claude-sonnet-4-20250514");
    expect(await openai.getStatus()).toBe("NOT_CONFIGURED");
    expect(await gemini.getStatus()).toBe("NOT_CONFIGURED");
    expect(await claude.getStatus()).toBe("NOT_CONFIGURED");
    const chat = await openai.chat([{ role: "user", content: "hi" }]);
    expect(chat.status).toBe("NOT_CONFIGURED");
    expect(chat.text).toBeNull();
  });

  it("maps 401 to AUTH_FAILED", async () => {
    vi.stubGlobal("fetch", jsonResponse(401, { error: { message: "invalid key" } }));
    const openai = new OpenAiAdapter("sk-bad", "gpt-4.1-mini");
    const result = await openai.testConnection();
    expect(result.status).toBe("AUTH_FAILED");
  });

  it("maps 403 to AUTH_FAILED", async () => {
    vi.stubGlobal("fetch", jsonResponse(403, { error: { message: "forbidden" } }));
    const gemini = new GeminiAdapter("bad", "gemini-2.0-flash");
    const result = await gemini.testConnection();
    expect(result.status).toBe("AUTH_FAILED");
  });

  it("maps 429 to RATE_LIMITED", async () => {
    vi.stubGlobal("fetch", jsonResponse(429, { error: { message: "rate" } }));
    const claude = new ClaudeAdapter("sk-ant-bad", "claude-sonnet-4-20250514");
    const result = await claude.testConnection();
    expect(result.status).toBe("RATE_LIMITED");
  });

  it("maps timeout to UNAVAILABLE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }),
    );
    const openai = new OpenAiAdapter("sk-test", "gpt-4.1-mini");
    const result = await openai.chat([{ role: "user", content: "hi" }]);
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.error).toBe("timeout");
  });

  it("falls back to the next configured provider", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("openai.com")) {
        return new Response(JSON.stringify({ error: { message: "down" } }), { status: 500 });
      }
      if (String(url).includes("generativelanguage")) {
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok-from-gemini" }] } }] }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const registry = new ProviderRegistry([
      new OpenAiAdapter("sk-test", "gpt-4.1-mini"),
      new GeminiAdapter("gem-test", "gemini-2.0-flash"),
      new ClaudeAdapter("", "claude-sonnet-4-20250514"),
    ]);
    const result = await registry.chatWithFallback([{ role: "user", content: "hi" }]);
    expect(result.text).toBe("ok-from-gemini");
    expect(result.usedFallback).toBe(true);
    expect(result.provider).toBe("gemini");
  });
});
