import { serve } from "@hono/node-server";
import { env } from "./env.ts";
import { openSqlite, migrate } from "./db/client.ts";
import { Repository } from "./db/repository.ts";
import { OpenAiAdapter } from "./adapters/ai/openai.ts";
import { GeminiAdapter } from "./adapters/ai/gemini.ts";
import { ClaudeAdapter } from "./adapters/ai/claude.ts";
import { ProviderRegistry } from "./engines/manager/provider-registry.ts";
import { ManagerAi } from "./engines/manager/manager-ai.ts";
import { VisionEngine } from "./engines/vision/vision-engine.ts";
import { CjDropshippingAdapter } from "./adapters/suppliers/cjdropshipping.ts";
import { CoupangAdapter } from "./adapters/marketplaces/coupang.ts";
import { NaverCommerceAdapter } from "./adapters/marketplaces/naver.ts";
import { createApp, refreshIntegrationRows } from "./routes/app.ts";
import { startWorker } from "./jobs/queue.ts";
import { resumeMissions } from "./organization/orchestrator.ts";
import { runWatchCycle } from "./watch/cycle.ts";
import { defaultRateLimiter } from "./data-hub/rate-limit.ts";
import type { AppServices } from "./app-context.ts";

function persistCjTokens(
  repo: Repository,
  tokens: { accessToken: string | null; refreshToken: string | null; accessExpiry: string | null },
): void {
  if (tokens.accessToken) repo.setEncryptedSecret("cj.accessToken", tokens.accessToken);
  if (tokens.refreshToken) repo.setEncryptedSecret("cj.refreshToken", tokens.refreshToken);
  if (tokens.accessExpiry) repo.setEncryptedSecret("cj.accessExpiry", tokens.accessExpiry);
}

export function buildServices(): AppServices {
  const db = openSqlite(env.databasePath);
  migrate(db);
  const repo = new Repository(db);
  const providers = new ProviderRegistry([
    new OpenAiAdapter(env.openaiKey, env.openaiModel),
    new GeminiAdapter(env.geminiKey, env.geminiModel),
    new ClaudeAdapter(env.anthropicKey, env.anthropicModel),
  ]);
  if (env.cjApiPassword && !env.cjApiKey) {
    console.warn(
      "CJ_API_PASSWORD is a legacy alias. Official v2 getAccessToken uses { apiKey }. Set CJ_API_KEY.",
    );
  }
  if (env.cjEmail) {
    console.warn("CJ_EMAIL is unused by official CJdropshipping v2 token API.");
  }
  const storedKey = repo.getEncryptedSecret("cj.apiKey");
  const storedAccess = repo.getEncryptedSecret("cj.accessToken");
  const storedRefresh = repo.getEncryptedSecret("cj.refreshToken");
  const storedExpiry = repo.getEncryptedSecret("cj.accessExpiry");
  return {
    repo,
    providers,
    manager: new ManagerAi(providers),
    vision: new VisionEngine(providers),
    cj: new CjDropshippingAdapter({
      apiKey: storedKey || env.cjApiKey,
      accessToken: storedAccess || env.cjAccessToken,
      refreshToken: storedRefresh || env.cjRefreshToken,
      accessExpiry: storedExpiry ?? undefined,
      writeEnabled: false,
      legacyPasswordAlias: env.cjApiPassword,
      limiter: defaultRateLimiter,
      onApiEvent: (row) => repo.recordApiEvent(row),
      persistTokens: (tokens) => persistCjTokens(repo, tokens),
    }),
    coupang: new CoupangAdapter(env.coupangAccessKey, env.coupangSecretKey, env.coupangVendorId),
    naver: new NaverCommerceAdapter(env.naverClientId, env.naverClientSecret),
  };
}

export function boot() {
  const services = buildServices();
  void refreshIntegrationRows(services);
  resumeMissions(services);
  runWatchCycle(services.repo);
  const app = createApp(services);
  const stopWorker = startWorker(services);
  const server = serve({ fetch: app.fetch, port: env.port, hostname: env.host }, (info) => {
    console.log(`AIZIO COMMERCE API http://${info.address}:${info.port}`);
  });
  const shutdown = () => {
    stopWorker();
    server.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return { app, services };
}

boot();
