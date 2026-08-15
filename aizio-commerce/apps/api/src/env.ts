import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

function loadDotEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

function str(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  host: str("HOST", "0.0.0.0"),
  databasePath: str("DATABASE_PATH", resolve(root, "data/aizio-commerce.sqlite")),
  encryptionKey: str("AIZIO_ENCRYPTION_KEY"),
  openaiKey: str("OPENAI_API_KEY"),
  openaiModel: str("OPENAI_MODEL", "gpt-4.1-mini"),
  geminiKey: str("GEMINI_API_KEY"),
  geminiModel: str("GEMINI_MODEL", "gemini-2.0-flash"),
  anthropicKey: str("ANTHROPIC_API_KEY"),
  anthropicModel: str("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
  cjEmail: str("CJ_EMAIL"),
  cjApiPassword: str("CJ_API_PASSWORD"),
  cjAccessToken: str("CJ_ACCESS_TOKEN"),
  coupangAccessKey: str("COUPANG_ACCESS_KEY"),
  coupangSecretKey: str("COUPANG_SECRET_KEY"),
  coupangVendorId: str("COUPANG_VENDOR_ID"),
  naverClientId: str("NAVER_CLIENT_ID"),
  naverClientSecret: str("NAVER_CLIENT_SECRET"),
  rootDir: root,
};

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}
