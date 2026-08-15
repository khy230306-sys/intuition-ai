import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { env, logCredentialHealth, tossConfigured } from './config/env.js';
import { ensureAutopilotRow } from './services/autopilot.js';
import { bootstrapBrokers, runRecovery } from './services/recovery.js';
import { registerRoutes } from './routes/api.js';
import { runtime } from './workers/runtime.js';
import { onActivity, emitEvent } from './services/events.js';
import { prisma } from './db/client.js';
import { refreshUniverse } from './services/universe.js';
import { credentialGuidance, runShadowConnectionVerify } from './services/shadowVerify.js';
import { registerControlPlaneAuth } from './services/controlPlaneAuth.js';

async function main() {
  logCredentialHealth();
  if (env.ALLOW_LIVE && !env.CONTROL_PLANE_TOKEN) {
    console.warn('[security] ALLOW_LIVE=true but CONTROL_PLANE_TOKEN empty — set a token before live trading');
  }
  await ensureAutopilotRow();
  await bootstrapBrokers();

  const guidance = credentialGuidance();
  if (guidance.needed) {
    console.log(guidance.message);
    await emitEvent('TOSS_CREDENTIALS_MISSING', 'Toss credentials NOT_CONFIGURED — see .env guidance', 'warn');
  } else {
    const verify = await runShadowConnectionVerify();
    await emitEvent(
      verify.allCriticalPass ? 'SHADOW_VERIFY_PASS' : 'SHADOW_VERIFY_FAIL',
      `Boot verify criticalPass=${verify.allCriticalPass} stages=${verify.stages.length}`,
      verify.allCriticalPass ? 'info' : 'warn',
    );
  }

  if (tossConfigured()) {
    try {
      const universe = await refreshUniverse(true);
      await emitEvent('UNIVERSE_REFRESH', `Universe LIVE symbols=${universe.length}`, 'info');
    } catch (e) {
      await emitEvent(
        'UNIVERSE_REFRESH',
        e instanceof Error ? e.message : 'universe failed (no REPLAY fallback)',
        'warn',
      );
    }
  } else {
    try {
      const universe = await refreshUniverse(true);
      await emitEvent('UNIVERSE_REFRESH', `Universe REPLAY_SEED symbols=${universe.length}`, 'info');
    } catch (e) {
      await emitEvent('UNIVERSE_REFRESH', e instanceof Error ? e.message : 'universe failed', 'warn');
    }
  }

  const recovery = await runRecovery();
  await emitEvent('SERVER_START', `AIZIO API boot — recovery resumed=${recovery.resumed}`, 'info', {
    details: recovery.details,
  });

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);
  registerControlPlaneAuth(app);

  await registerRoutes(app);

  app.get('/ws/activity', { websocket: true }, (socket) => {
    const off = onActivity((item) => {
      try {
        socket.send(JSON.stringify(item));
      } catch {
        /* closed */
      }
    });
    socket.on('close', () => off());
  });

  runtime.start();

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`AIZIO TRADE API on http://${env.API_HOST}:${env.API_PORT}`);

  const shutdown = async () => {
    runtime.stop();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
