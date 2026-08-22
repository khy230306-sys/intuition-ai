import { env } from '../config/env.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  readonly name: string;
  configured(): boolean;
  complete(messages: ChatMessage[], opts?: { timeoutMs?: number }): Promise<string>;
}

function baseUrlFor(provider: string): string {
  if (env.AI_PROVIDER_BASE_URL) return env.AI_PROVIDER_BASE_URL.replace(/\/$/, '');
  if (provider === 'openai') return 'https://api.openai.com/v1';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (provider === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  return '';
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(readonly name: string, private readonly baseUrl: string) {}

  configured(): boolean {
    return Boolean(this.baseUrl && env.AI_PROVIDER_API_KEY && env.AI_PROVIDER_MODEL);
  }

  async complete(messages: ChatMessage[], opts?: { timeoutMs?: number }): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? env.AI_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.AI_PROVIDER_MODEL,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`AI_HTTP_${res.status}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI_EMPTY');
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getAiProvider(): AiProvider {
  const kind = env.AI_PROVIDER === 'none' ? 'custom' : env.AI_PROVIDER;
  const base = baseUrlFor(kind);
  const name = kind === 'custom' ? 'custom-openai-compatible' : kind;
  return new OpenAiCompatibleProvider(name, base);
}
