import type { ProviderStatus, VisionAnalysis } from "../../shared/types.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  status: ProviderStatus;
  text: string | null;
  error: string | null;
  provider: string;
  usedFallback: boolean;
  source: "AI";
}

export interface VisionResult {
  status: ProviderStatus;
  analysis: VisionAnalysis | null;
  error: string | null;
  provider: string;
}

export interface AiProvider {
  id: string;
  label: string;
  getStatus(): Promise<ProviderStatus>;
  chat(messages: ChatMessage[], opts?: { json?: boolean }): Promise<ChatResult>;
  vision?(imageBase64: string, mimeType: string, prompt: string): Promise<VisionResult>;
  testConnection(): Promise<{ status: ProviderStatus; error: string | null }>;
}
