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
  DEFAULT_MODE: z.enum(['PAPER', 'LIVE']).default('PAPER'),
  DEFAULT_CAPITAL: z.coerce.number().default(3_000_000),
  HEARTBEAT_MS: z.coerce.number().default(8000),
  WORKER_TICK_MS: z.coerce.number().default(3000),
  TOSS_CLIENT_ID: z.string().optional().default(''),
  TOSS_CLIENT_SECRET: z.string().optional().default(''),
  TOSS_ACCOUNT_SEQ: z.string().optional().default(''),
  TOSS_API_BASE_URL: z.string().default('https://openapi.tossinvest.com'),
  AI_PROVIDER_BASE_URL: z.string().optional().default(''),
  AI_PROVIDER_API_KEY: z.string().optional().default(''),
  AI_PROVIDER_MODEL: z.string().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().default(15_000),
  AI_REQUIRED_FOR_ENTRY: z
    .string()
    .optional()
    .default('true')
    .transform((v) => v !== 'false' && v !== '0'),
  MARKET_DATA_PROVIDER: z.enum(['toss', 'replay']).default('replay'),
  /** PAPER + replay only: treat KR session as REGULAR so off-hours E2E can run without mocking fills. */
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
});

export const env = schema.parse(process.env);

export function tossConfigured(): boolean {
  return Boolean(env.TOSS_CLIENT_ID && env.TOSS_CLIENT_SECRET);
}

export function aiConfigured(): boolean {
  return Boolean(env.AI_PROVIDER_BASE_URL && env.AI_PROVIDER_API_KEY && env.AI_PROVIDER_MODEL);
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
