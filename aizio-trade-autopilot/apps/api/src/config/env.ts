import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().default('file:./dev.db'),
  DEFAULT_MODE: z
    .enum(['PAPER', 'PAPER_REPLAY', 'SHADOW', 'LIVE_OBSERVE', 'LIVE'])
    .default('PAPER'),
  DEFAULT_CAPITAL: z.coerce.number().default(3_000_000),
  HEARTBEAT_MS: z.coerce.number().default(8000),
  WORKER_TICK_MS: z.coerce.number().default(3000),
  TOSS_CLIENT_ID: z.string().optional().default(''),
  TOSS_CLIENT_SECRET: z.string().optional().default(''),
  TOSS_ACCOUNT_SEQ: z.string().optional().default(''),
  TOSS_API_BASE_URL: z.string().default('https://openapi.tossinvest.com'),
  AI_PROVIDER: z.enum(['none', 'openai', 'gemini', 'openrouter', 'custom']).default('none'),
  AI_PROVIDER_BASE_URL: z.string().optional().default(''),
  AI_PROVIDER_API_KEY: z.string().optional().default(''),
  AI_PROVIDER_MODEL: z.string().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().default(15_000),
  AI_MAX_DECISION_AGE_MS: z.coerce.number().default(20_000),
  AI_REQUIRED_FOR_ENTRY: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  /** Explicit only: 'replay' | 'toss' | 'auto' (auto picks toss when configured + mode needs live data) */
  MARKET_DATA_PROVIDER: z.enum(['toss', 'replay', 'auto']).default('auto'),
  PAPER_SIMULATE_REGULAR_SESSION: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  ALLOW_LIVE: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  FRESHNESS_KR_MS: z.coerce.number().default(60_000),
  FRESHNESS_US_MS: z.coerce.number().default(90_000),
  UNIVERSE_INCLUDE_ETF: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  UNIVERSE_INCLUDE_ETN: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  UNIVERSE_COMMON_SHARE_ONLY: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  SCANNER_BROAD_INTERVAL_MS: z.coerce.number().default(60_000),
  SCANNER_WATCH_INTERVAL_MS: z.coerce.number().default(5_000),
  UNIVERSE_REFRESH_MS: z.coerce.number().default(86_400_000),
});

export const env = schema.parse(process.env);

export function tossConfigured(): boolean {
  return Boolean(env.TOSS_CLIENT_ID && env.TOSS_CLIENT_SECRET && env.TOSS_ACCOUNT_SEQ);
}

export function tossCredentialsPresent(): {
  clientId: boolean;
  clientSecret: boolean;
  accountSeq: boolean;
} {
  return {
    clientId: Boolean(env.TOSS_CLIENT_ID),
    clientSecret: Boolean(env.TOSS_CLIENT_SECRET),
    accountSeq: Boolean(env.TOSS_ACCOUNT_SEQ),
  };
}

export function aiConfigured(): boolean {
  if (env.AI_PROVIDER === 'none') {
    return Boolean(env.AI_PROVIDER_BASE_URL && env.AI_PROVIDER_API_KEY && env.AI_PROVIDER_MODEL);
  }
  return Boolean(env.AI_PROVIDER_API_KEY && env.AI_PROVIDER_MODEL);
}

export function logCredentialHealth(): void {
  const c = tossCredentialsPresent();
  console.log(
    `[credentials] TOSS_CLIENT_ID=${c.clientId ? 'CONFIGURED' : 'MISSING'} ` +
      `TOSS_CLIENT_SECRET=${c.clientSecret ? 'CONFIGURED' : 'MISSING'} ` +
      `TOSS_ACCOUNT_SEQ=${c.accountSeq ? 'CONFIGURED' : 'MISSING'} ` +
      `AI=${aiConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED'} ` +
      `ALLOW_LIVE=${env.ALLOW_LIVE ? 'true' : 'false'}`,
  );
}

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(env.TOSS_CLIENT_SECRET || '___', '[REDACTED]')
      .replace(env.TOSS_CLIENT_ID || '___', '[REDACTED]')
      .replace(env.AI_PROVIDER_API_KEY || '___', '[REDACTED]');
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|password|authorization|api[_-]?key/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return value;
}
