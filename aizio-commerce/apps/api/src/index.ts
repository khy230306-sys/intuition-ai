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
import type { AppServices } from "./app-context.ts";

export function buildServices(): AppServices {
  const db = openSqlite(env.databasePath);
  migrate(db);
  const repo = new Repository(db);
  const providers = new ProviderRegistry([
    new OpenAiAdapter(env.openaiKey, env.openaiModel),
    new GeminiAdapter(env.geminiKey, env.geminiModel),
    new ClaudeAdapter(env.anthropicKey, env.anthropicModel),
  ]);
  return {
    repo,
    providers,
    manager: new ManagerAi(providers),
    vision: new VisionEngine(providers),
    cj: new CjDropshippingAdapter({
      apiKey: env.cjApiKey || env.cjApiPassword,
      accessToken: env.cjAccessToken,
      refreshToken: env.cjRefreshToken,
      writeEnabled: false,
    }),
    coupang: new CoupangAdapter(env.coupangAccessKey, env.coupangSecretKey, env.coupangVendorId),
    naver: new NaverCommerceAdapter(env.naverClientId, env.naverClientSecret),
  };
}

export function boot() {
  const services = buildServices();
  void refreshIntegrationRows(services);
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
